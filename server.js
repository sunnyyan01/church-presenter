import { createServer } from "http";
import { readFile } from "fs";
import 'ws';
import { bibleLookupEndpoint } from "./server/bible.js";
import { extToMimeType, serverResp, serverTextResp } from "./server/common.js";

const hostname = '127.0.0.1';
const port = 3000;

const endpointMap = {
    "/bible-lookup": bibleLookupEndpoint,
}

const server = createServer((req, res) => {
    let url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.includes(".")) {
        let parts = url.pathname.split(".");
        let ext = parts.pop();
        readFile(`./${url.pathname}`, 'utf-8', (err, data) => {
            if (err)
                serverTextResp(res, `${err.name}: ${err.message}`, 500);
            else
                serverResp(res, data, {'Content-Type': extToMimeType(ext)});
        });
    } else {
        let endpointFn = endpointMap[url.pathname];
        if (endpointFn)
            endpointFn(req, url, res);
        else
            serverTextResp(res, `Invalid API endpoint: ${url.pathname}`, 404);
    }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});