import express from 'express';
import { exec } from 'child_process';
import { platform } from 'os';
import { WebSocketServer } from 'ws';
import { bibleLookup } from "./server/bible.js";
import { remoteQr } from "./server/remote.js"

console.log(`===
Church Presenter by Sunny Yan
===
Starting up ... please wait`)

const app = express();
app.port = 3000;

app.use(express.static('public'));

app.get('/api/bible-lookup', bibleLookup);
app.get('/api/remote-qr', remoteQr);

const server = app.listen(app.port, () => {
    console.log("Ready!")
    console.log(`Opening http://localhost:${app.port}/presenter.html`);
    const openCmd = platform() == "win32" ? "start" : "xdg-open";
    exec(`${openCmd} http://localhost:${app.port}/presenter.html`,
        err => {
            if (err)
                console.log("Failed to automatically open. Please open the above URL in your browser of choice.")
        }
    );
});

const wss = new WebSocketServer({ server, clientTracking: true });
wss.shouldHandle = req => {
    let url = new URL(req.url, `ws://${req.headers.host}`);
    return url.pathname.match(/\/ws\/(presenter|remote|slideshow)/);
}

wss.on('connection', (ws, req) => {
    let url = new URL(req.url, `http://${req.headers.host}`);
    ws.origin = url.pathname.replace("/ws/","");

    ws.on('error', console.error);
  
    ws.on('message', data => {
        let {dest, message} = JSON.parse(data);
        wss.clients.forEach(client => {
            if (client.origin === dest) {
                client.send(JSON.stringify({origin: ws.origin, message}))
            }
        })
    });
});