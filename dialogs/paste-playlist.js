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
    let processed = [];
    for (let line of editor.value.split("\n")) {
        processed.push(line);
        let match = /1,.+,(.+)/.exec(line);
        if (match) {
            let location = match[1];
            let resp = await fetch(`http://localhost:3000/bible-lookup?loc=${location}`);
            if (resp.ok) {
                let text = await resp.text();
                processed.push(text);
            }
        }
    }
    editor.value = processed.join("\n");
}

function submit() {
    let editor = document.getElementById("editor");
    window.opener.postMessage(
        {type: "paste-playlist", playlist: editor.value}, "*"
    )

    window.close();
}