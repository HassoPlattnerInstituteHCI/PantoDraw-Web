# DualPanto Drawing

Finish this app and draw a nice picture

## How to

make sure you have `node` installed. 

run `npm install` to download all dependencies. Once done run `npm run dev` to build the project. Then visit http://127.0.0.1:5173/dualpanto-webusb-draw/ to try out your app

To start click on the "select dualpanto" button, select the serial device that represents your dualpanto, confirm your selection and click on "start comunication with panto"


## your task

Open the file `src/HandlePantoMessage` and look for TODO BIS. Your task is to implement the message handling so your panto draw works.


## bored?

Here are some more ideas if you want to dig deeper...

1. increase / decrease the brush size using the endcoders on the handles
2. restyle the webapp. Check out the documentation for the ui library [here](https://mui.com/material-ui/all-components/) 
3. implement physics walls that prevent you panto handles from leaving the drawing board
4. come up with a cool usecase for the second handle... maybe a 2 player drawing tool?
5. still there? Why not use this webstack to build a game?

## troubleshooting

As webserial is right now (may 2024) only supported on chromium based browsers, please use google chrome or chromium for testing
You can also check support for your browser [here](https://caniuse.com/web-serial)

So far, this project has been tested under node16 and node20 on windows 10, 11, ubuntu 22 and macos (ARM). If you have any issues please contact martin taraz on his hpi email or open a github issue.
