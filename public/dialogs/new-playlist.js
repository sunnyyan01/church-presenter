REPLACE_MAP = {
    "：": ": ",
    // "——": "-",
    "；": "; ",
    "？": "? ",
    "，": ", ",
}
function fixSymbols() {
    let editor = document.getElementById("editor");
    let processed = "";
    for (let c of Array.from(editor.value)) {
        processed += REPLACE_MAP[c] || c;
    }
    editor.value = processed;
}

async function autoBible() {
    let editor = document.getElementById("editor");
    let {selectionStart, selectionEnd} = editor;

    if (selectionStart === selectionEnd) {
        let processed = [];
        for (let line of editor.value.split("\n")) {
            processed.push(line);
            let match = /1,[^,]+,([^,]+)/.exec(line);
            let match2 = /version=(.+)(,|$)/.exec(line);
            if (match) {
                let url = window.origin + `/api/bible-lookup?loc=${match[1]}`
                if (match2)
                    url += '&version=' + match2[1];
                let resp = await fetch(url);
                let text = await resp.text();
                if (resp.ok) {
                    processed.push(text.trim()+"E");
                } else {
                    handleError({
                        row: processed.length - 1,
                        error: new Error(text),
                    })
                }
            }
        }
        editor.value = processed.join("\n");
    } else {
        let line = editor.value.substring(selectionStart, selectionEnd);
        let match = /1,[^,]+,([^,]+)/.exec(line);
        let match2 = /version=(.+)(,|$)/.exec(line);
        if (match) {
            let url = window.origin + `/api/bible-lookup?loc=${match[1]}`
                if (match2)
                    url += '&version=' + match2[1];
            let resp = await fetch(url);
            if (resp.ok) {
                let text = await resp.text();
                editor.setRangeText(line + "\n" + text.trim() + "E\n");
            }
        }
    }
}

function submit() {
    let editor = document.getElementById("editor");
    window.opener.postMessage(
        {type: "new-playlist", playlist: editor.value}, "*"
    )
}

function handleError({row, col, error}) {
    let errorDisp = document.getElementById("error-disp");
    errorDisp.textContent = error.message;
}

const MSG_HANDLERS = {
    "submit-success": () => window.close(),
    "submit-error": handleError,
};
window.addEventListener("message", e => {
    let {data} = e;
    MSG_HANDLERS[data.type](data);
})

window.addEventListener("load", loadTranslations);