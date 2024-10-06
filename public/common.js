class TextReader {
    lines;
    idx;
    canRead;
    lastRead;

    constructor(text) {
        let newline = text.includes("\r") ? "\r\n" : "\n";
        this.lines = text.trim().split(newline);
        this.idx = -1;
        this.canRead = this.lines.length > 0;
        this.lastRead = null;
    }

    read() {
        if (!this.canRead)
            throw Error(`Cannot read past end of file`);
        this.lastRead = this.lines[++this.idx];
        if (this.idx + 1 >= this.lines.length)
            this.canRead = false;
        return this.lastRead;
    }
}

class FormatString {
    tokens;

    constructor(string) {
        this.tokens = string.match(/{}|[^{}]+/g);
    }

    format(...params) {
        let i = 0;
        let str = "";
        for (let token of this.tokens) {
            if (token === "{}") {
                str += params[i++];
            } else {
                str += token;
            }
        }
        return str;
    }
}