enum MessageType {
    Sync = 0x00,
    Heartbeat = 0x01,
    InvalidData = 0x06,
    Position = 0x10,
    DebugLog = 0x20,
}

export interface IMessage {
    message: Uint8Array;
    id: string;
}

export class HandlePantoMessage {
    public sendMessage: (msg: Uint8Array) => void;
    public sendDebug: (msg: string) => void;
    public setPosition: (posX: number, posY: number) => void;

    constructor() {
        this.sendDebug = (msg: string) => {
            this.sendDebug(msg);
        }
        this.sendMessage = (msg: Uint8Array) => {
            this.sendDebug(HandlePantoMessage.bytesToStringMsg(msg));
        }
        this.setPosition = (posX: number, posY: number) => {
            this.sendDebug(`trying to setPosition: ${posX}, posY: ${posY} but no callback is defined`);
        }
    }

    public static bytesToStringMsg(msg: Uint8Array): string {
        let res = ""
        for (const a of msg) {
            res = res.concat(
                "0x" + a.toString(16) + " "
            );
        }
        return res;
    }

    private static expected_header = new Uint8Array([0x44, 0x50]);

    private static areBytewiseEqual(a: Uint8Array, b: Uint8Array): boolean {
        return indexedDB.cmp(a, b) === 0;
    }

    public static lerp(val: number, from: number, to: number): number {
        return (val - from) / (to - from);
    }

    public static lerpAndClamp0to1(val: number, from: number, to: number): number {
        const lerp = this.lerp(val, from, to);
        return Math.min(Math.max(lerp, 0), 1);
    }

    private logPos(x1: Uint8Array, y1: Uint8Array): void {
        this.sendDebug(HandlePantoMessage.bytesToStringMsg(x1) + " " + HandlePantoMessage.bytesToStringMsg(y1))
        const x = new DataView(x1.buffer).getFloat32(0);
        const y = new DataView(x1.buffer).getFloat32(0);
        this.sendDebug(`[HandlePantoMessage] ${x}: ${y}`);
    }

    public onMessage(message: IMessage) {
        if (message.message.length < 6) {
            console.error("message to short for parsing");
            return;
        }
        const header = message.message.subarray(0, 2);
        if (!HandlePantoMessage.areBytewiseEqual(header, HandlePantoMessage.expected_header)) {
            console.error("invalid header");
            return;
        }
        const type = message.message.at(2) as number;
        const packetId = message.message.at(3);
        const payloadLength = (message.message.at(4) as number) << 8 | ((message.message.at(5) as number));
        if ((message.message.length - 6) !== payloadLength) {
            console.error("message shorter than payload indicated");
            return;
        }
        switch (type) {
            case MessageType.Sync:
                this.sendDebug("received: sync");
                // send SyncAck message
                this.sendMessage(new Uint8Array([
                    0x44, 0x50, 0x80, 0x00, 0x00, 0x00
                ]));
                break;
            case MessageType.Heartbeat:
                // TODO BIS handle the heartbeat by send the correct response
                // TODO BIS read the protocol definition here
                // TODO BIS https://github.com/HassoPlattnerInstituteHCI/dualpantoframework/blob/BIS/documentation/protocol/protocol.md
                // TODO BIS look at the MessageType.Sync to get an idea
                break;
            // TODO BIS handle debug messages here
            case MessageType.InvalidData:
                console.error("received: invalid data");
                break;
            case MessageType.Position:
                const x1 = message.message.subarray(6, 10);
                const x = new DataView(new Uint8Array(x1).buffer).getFloat32(0);
                // TODO BIS parse y the same way as x
                const y = 42;
                const minX = -80;
                const maxX = 140;
                const minY = -16;
                const maxY = -180;
                const clampedX = HandlePantoMessage.lerpAndClamp0to1(x, minX, maxX);
                const clampedY = HandlePantoMessage.lerpAndClamp0to1(y, minY, maxY);
                this.setPosition(clampedX, clampedY);
                break;
            default:
                console.error("message not understood: " + HandlePantoMessage.bytesToStringMsg(message.message));
        }
    }
}