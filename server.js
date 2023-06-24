import { createServer } from "http";
import 'ws';
import { bibleLookupEndpoint } from "./server/bible.js";
import { serverTextResp } from "./server/common.js";

const hostname = '127.0.0.1';
const port = 3000;

const endpointMap = {
    "/bible-lookup": bibleLookupEndpoint,
}

const server = createServer((req, res) => {
    let url = new URL(req.url, `http://${req.headers.host}`); 
    let endpointFn = endpointMap[url.pathname];
    if (endpointFn)
        endpointFn(req, url, res);
    else
        serverTextResp(res, `Invalid API endpoint: ${url.pathname}`, 404);
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});