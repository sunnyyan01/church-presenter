export function extToMimeType(ext) {
    return {
        'html': 'text/html; charset=utf-8',
        'js': 'text/javascript',
        'css': 'text/css',
        'json': 'application.json',
        'svg': 'image/svg+xml',
        'csv': 'text/csv',
    }[ext] || 'text/plain'
}

export function serverResp(res, content, headers={}, code=200) {
    res.statusCode = code;
    for (let [header, val] of Object.entries(headers)) {
        res.setHeader(header, val);
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(content);
}

export function serverTextResp(res, text, code=200) {
    res.statusCode = code;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(text);
}