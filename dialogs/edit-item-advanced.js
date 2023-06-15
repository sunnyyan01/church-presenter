let itemIdx;

window.addEventListener("message", e => {
    if (e.data.type != "init")
        return;
    
    itemIdx = e.data.idx;
    document.getElementById("json-editor").value = JSON.stringify(e.data.item);

    document.getElementById("save-btn").classList.remove("hidden");
})

function save() {
    let json = document.getElementById("json-editor").value;
    window.opener.postMessage(
        {type: "item-editor-close", idx: itemIdx, item: JSON.parse(json)}, "*"
    );

    window.close();
}