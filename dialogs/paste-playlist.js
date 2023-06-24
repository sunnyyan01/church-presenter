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

function submit() {
    let editor = document.getElementById("editor");
    window.opener.postMessage(
        {type: "paste-playlist", playlist: editor.value}, "*"
    )

    window.close();
}