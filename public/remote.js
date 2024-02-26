let ws;

function wsConnect() {
    let { hostname, port } = window.location;
    ws = new WebSocket(`ws://${hostname}:${port}/ws/remote`);
    ws.addEventListener("open", e => {
        let dot = document.getElementById("ws-connection-dot");
        dot.dataset.status = "connected";
    });
    ws.addEventListener("message", e => {
        let {origin, message} = JSON.parse(e.data);
        if (message.type === "error") {
            
        }
    });
    ws.addEventListener("close", e => {
        let dot = document.getElementById("ws-connection-dot");
        dot.dataset.status = "disconnected";
    })
}

function wsSend(message) {
    if (ws) {
        ws.send(JSON.stringify({
            origin: "remote",
            dest: "presenter",
            message,
        }));
    }
}

function sendKey(key) {
    wsSend({type: "shortkey", key})
}

window.addEventListener("load", wsConnect);