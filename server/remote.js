import { execSync } from 'child_process';

function getLocalIp() {
    let stdout = execSync("ipconfig", {encoding: "utf-8"});
    let lines = stdout.split("\n");
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith("IPv4 Address")) {
            return line.match(/[0-9.]{7,}/);
        }
    }
}

export function remoteQr(req, res) {
    if (!req.app.ip)
        req.app.ip = getLocalIp();

    res.send(`http://${req.app.ip}:${req.app.port}/remote.html`);
}