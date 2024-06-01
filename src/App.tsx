import * as React from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

import {
    AppBar,
    Button, ButtonGroup, FormControlLabel, FormGroup,
    Paper, Switch, ToggleButton, ToggleButtonGroup, Toolbar
} from "@mui/material";

import {useEffect} from "react";
import {HandlePantoMessage} from "./HandlePantoMessage";
import {v4 as uuidv4} from "uuid";

interface ISerialPort {
    open(args: { baudRate: number }): Promise<void>;

    close(): Promise<void>;

    writable: {
        getWriter(): { write(data: Uint8Array): Promise<void>; releaseLock(): void }
    }

    readable: {
        getReader(): { read(): Promise<{ value: Uint8Array, done: boolean }>; releaseLock(): void };
    }
}

interface IPos {
    x: number
    y: number
}

export default function App() {
    const [pantoConnectedBtnText, setPantoConnectedBtnText] = React.useState("Start Communication with panto");
    const [pantoConnected, setPantoConnected] = React.useState(false);
    const [port, setPort] = React.useState<ISerialPort | null>(null);
    const [pos, setPos] = React.useState<IPos | null>(null);
    const [lastPos, setLastPos] = React.useState<IPos | null>(null);
    const [color, setColor] = React.useState<string>("red")
    const [lift, setLift] = React.useState<boolean>(false);
    const [enableMouse, setEnableMouse] = React.useState(true);
    const [enableDebugLogs, setEnableDebugLog] = React.useState(true);

    const messageHandler = new HandlePantoMessage();


    const handlePantoConnectToggle = async () => {
        if (pantoConnected) {
            // TODO cleanup on disconnect
            // disable panto connection
            // deregister callback
            messageHandler.sendMessage = (msg: Uint8Array) => {
                console.log(msg);
            }
            setPantoConnected(false);
        } else {
            await port?.open({
                baudRate: 115200
            });
            setPantoConnected(true);
            const writer = port?.writable.getWriter();
            messageHandler.sendMessage = (msg: Uint8Array) => {
                if (enableDebugLogs) {
                    console.log("sending message", HandlePantoMessage.bytesToStringMsg(msg));
                }
                writer?.write(msg)
            };
            messageHandler.setPosition = (posX: number, posY: number) => {
                setPos({x: posX, y: posY});
            };
            messageHandler.sendDebug = (msg: string) => {
                if (enableDebugLogs) {
                    console.log(msg)
                }
            }
            await doWhile();
        }
    }

    const doWhile = async () => {
        // js Uint8Arrays are of fixed length, thus we need to juggle them around like this...
        let currentMsgBuffer = new Uint8Array();
        let tmp = new Uint8Array();
        const reader = port?.readable.getReader();
        if (!reader) {
            console.error("could not open reader")
            return;
        }

        while (port) {
            const {value, done} = await reader.read();
            tmp = new Uint8Array(currentMsgBuffer);

            const bufferLength = tmp.length + value.length;
            if (bufferLength >= 1024 * 1024) {
                throw new Error("buffer length exceeded 1MB - stopping parsing");
            }
            currentMsgBuffer = new Uint8Array(bufferLength);
            currentMsgBuffer.set(tmp);
            currentMsgBuffer.set(value, tmp.length);
            if (done) {
                // Allow the serial port to be closed later.
                reader.releaseLock();
                break;
            }
            // extract complete messages from currentMsgBuffer
            const messages: Uint8Array[] = [];
            // since a message header is 6 bytes, we only iterate until length - 5
            // even if a valid header is started in the last 5 bytes the message can not finish, plus we'd need to check out of bounds all the time...
            for (let i = 0; i < currentMsgBuffer.length - 5; i++) {
                if (currentMsgBuffer[i] == 0x44 && currentMsgBuffer[i + 1] == 0x50) {
                    // extract the message length
                    const payloadLength = (currentMsgBuffer.at(i + 4) as number) << 8 | ((currentMsgBuffer.at(i + 5) as number));
                    if ((i + 6 + payloadLength) < currentMsgBuffer.length) {
                        messages.push(currentMsgBuffer.subarray(i, i + 6 + payloadLength));
                    }
                    i += 5 + payloadLength; // i will be incremented afterwards
                }
            }
            for (const msg of messages) {
                messageHandler.onMessage(
                    {
                        message: msg,
                        id: uuidv4(),
                    }
                )
            }
        }
    }

    function getCanvas() {
        const canvas = document.getElementById("drawing_canvas") as HTMLCanvasElement;
        if (!canvas) {
            throw new Error("Could not get canvas");
        }
        return canvas;
    }

    function getCanvasCtx(): CanvasRenderingContext2D {
        const canvas = getCanvas();
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        if (!ctx) {
            throw new Error("could not get 2d context");
        }
        return ctx;
    }

    function resizeCanvas() {
        const canvas = getCanvas();
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    const resetCanvas = () => {
        resizeCanvas();
        getCanvasCtx().reset();
    }

    const saveCanvas = () => {
        const canvas = getCanvas();
        var link = document.createElement('a')
        link.setAttribute('download', 'YourPieceOfArt.png');
        link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
        link.click();
        link.remove();
    }

    const mouseDrawingListener = (e: MouseEvent) => {
        return;
        const canvas = getCanvas();
        const currX = (e.clientX - canvas.offsetLeft) / canvas.width;
        const currY = (e.clientY - canvas.offsetTop) / canvas.height;
        setPos({
                x: currX,
                y: currY
            }
        );
    }

    const setupClickDraw = () => {
        const canvas = getCanvas();

        canvas.addEventListener("mousedown", (e) => {
            setLift(false);
        })

        canvas.addEventListener("mouseup", (e) => {
            setLift(true);
        })
    }

    useEffect(() => {
        const canvas = getCanvas();
        if(enableMouse) {
            console.log("add event listener");
            canvas.addEventListener("mousemove", mouseDrawingListener)
        } else {
            console.log("remove event listener");
            canvas.onmousemove = null;
        }
    }, [enableMouse]);

    const setupKeybinds = () => {
        document.addEventListener("keydown", (e) => {
            switch (e.key) {
                case "r":
                    resetCanvas();
                    break;
                case "s":
                    saveCanvas();
                    break;
                case "1":
                    setLift(true);
                    setColor("lift");
                    break;
                case "2":
                    setLift(false);
                    setColor("red");
                    break;
                case "3":
                    setLift(false);
                    setColor("blue");
                    break;
                case "4":
                    setLift(false);
                    setColor("green")
                    break;
                case "5":
                    setLift(false);
                    setColor("white");
            }
        })
    }

    function setupOnWindowResize() {
        document.addEventListener("resize", (e) => {resizeCanvas()});
    }

    // on component load do a couple of setup things
    useEffect(() => {
        resetCanvas();
        setupClickDraw();
        setupKeybinds();
        setupOnWindowResize();
    }, []);

    useEffect(() => {
        if (pos) {
            draw(pos);
        }
    }, [pos]);

    useEffect(() => {
        if (port === null) {
            document.getElementById("toggle_panto_com_btn")?.setAttribute("disabled", "disabled");
            document.getElementById("select_panto_btn")?.removeAttribute("disabled");
        } else {
            document.getElementById("toggle_panto_com_btn")?.removeAttribute("disabled");
            document.getElementById("select_panto_btn")?.setAttribute("disabled", "disabled");
        }
    }, [port])


    useEffect(() => {
        setPantoConnectedBtnText(pantoConnected ? "Stop Communication with panto" : "Start Communication with panto");
    }, [pantoConnected]);

    const header_btn_style = {color: "#ffffff"};

    function coordinatesToCanvas(pos: IPos): IPos {
        const canvas = getCanvas();
        return {
            x: pos.x * canvas.width,
            y: pos.y * canvas.height,
        }
    }

    function draw(pos: IPos) {
        if (lift) {
            setLastPos(pos);
            return;
        }
        if (!lastPos) {
            setLastPos(pos);
            return;
        }
        const ctx = getCanvasCtx();
        ctx.strokeStyle = color;
        if (color === "white") {
            ctx.lineWidth = 50;
        } else {
            ctx.lineWidth = 2;
        }
        ctx.beginPath();
        const l = coordinatesToCanvas(lastPos)
        const p = coordinatesToCanvas(pos)
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        setLastPos(pos);
    }


    async function requestDevice() {
        try {
            // not every browser supports webserial, thus typescript freaks out a bit here
            // for 90% of all desktop browsers we'll be fine
            setPort(await (navigator as any).serial.requestPort() as ISerialPort);
        } catch (e) {
            console.error(e);
        }
    }

    function handleColorChange(event: React.MouseEvent<HTMLElement>, val: string | null) {
        if (val !== null) {
            if (val === "lift") {
                setLift(true)
                setColor("lift");
            } else {
                setLift(false);
                setColor(val);
            }
        }
    }

    return (
        <Container sx={{width: 1}}>
            {/*TODO move the appbar into a modal*/}
            <AppBar position="fixed">
                <Toolbar>
                    <Button sx={header_btn_style} id={"select_panto_btn"} onClick={requestDevice}> Select
                        DualPanto</Button>
                    <Button sx={header_btn_style} id={"toggle_panto_com_btn"}
                            onClick={handlePantoConnectToggle}>{pantoConnectedBtnText}</Button>
                </Toolbar>
            </AppBar>
            <Toolbar/>

            <Box sx={{width: 1}}>
                <Typography variant="h4" component="h1" sx={{mb: 2}} align="center">
                    DualPanto Drawing
                </Typography>
                <Typography>
                    Position: {pos?.x.toFixed(2)} | {pos?.y.toFixed(2)}
                </Typography>
                <Paper>
                    <Box sx={{width: 1, height: "45rem"}}>
                        <canvas id={"drawing_canvas"} width={"100%"} height={"100%"}/>
                    </Box>
                </Paper>
                <br/>
                <ButtonGroup>
                    <Button onClick={resetCanvas} id="reset-btn">
                        Reset Canvas
                    </Button>
                    <Button onClick={saveCanvas} id="save-btn">
                        Save Artwork
                    </Button>
                    {/*TODO add icons*/}
                    <ToggleButtonGroup value={color} exclusive onChange={handleColorChange}>
                        <ToggleButton value="lift" id="lift-btn">
                            lift pen
                        </ToggleButton>
                        <ToggleButton value="red" id="red-btn">
                            red
                        </ToggleButton>
                        <ToggleButton value="blue" id="blue-btn">
                            blue
                        </ToggleButton>
                        <ToggleButton value="green" id="green-btn">
                            green
                        </ToggleButton>
                        <ToggleButton value="white" id="erazer-btn">
                            Erazer
                        </ToggleButton>
                    </ToggleButtonGroup>
                    <FormGroup>
                        <FormControlLabel
                            control={<Switch checked={enableDebugLogs} onChange={(e, c) => setEnableDebugLog(c)}/>}
                            label="Enable Debug Logs"/>
                    </FormGroup>
                </ButtonGroup>
            </Box>
        </Container>
    );
}