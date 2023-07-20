let ws;

function wsConnect() {
    let { hostname, port } = window.location;
    ws = new WebSocket(`ws://${hostname}:${port}/ws/remote`);
    ws.addEventListener("open", e => {
        let p = document.getElementById("server-connect-status");
        p.innerText = "Connected";
    });
    ws.addEventListener("message", e => {
        let {origin, message} = JSON.parse(e.data);
        if (message.type === "error") {
            
        }
    });
    ws.addEventListener("close", e => {
        let p = document.getElementById("server-connect-status");
        p.innerText = "Connection lost";
    })
}

function wsSend(message) {
    ws.send(JSON.stringify({
        origin: "remote",
        dest: "presenter",
        message,
    }))
}

function sendKey(key) {
    wsSend({type: "shortkey", key})
}