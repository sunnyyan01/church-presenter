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
