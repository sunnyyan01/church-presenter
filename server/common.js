export function serverTextResp(res, text, code=200) {
    res.statusCode = code;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(text);
}