let itemIdx;

window.addEventListener("message", e => {
    if (e.data.type != "init")
        return;
    
    itemIdx = e.data.idx;
    let itemData = e.data.item;

    let table = document.getElementById("item-data-table");
    for (let row of table.rows) {
        let key = row.id.replace("item-data-table-row--","");
        let val = itemData[key];

        if (val === undefined) {
            if (key != "preview") // Preview should not be ever hidden
                row.classList.add("hidden");
            continue;
        }

        let valueElement = row.children[1].children[0];
        if (key === "slides") {
            valueElement.value = val.join("N\n");
        } else {
            valueElement.value = val;
        }
    }

    table.classList.remove("hidden");
    document.getElementById("save-btn").classList.remove("hidden");
})

function getCurValue(key) {
    let row = document.getElementById(`item-data-table-row--${key}`);
    return row.children[1].children[0].value;
}
function setValue(key, val) {
    let row = document.getElementById(`item-data-table-row--${key}`);
    row.children[1].children[0].value = val;
}

function onTemplateChange() {
    let changeTo = document.getElementById("template-selector").value;
    let fieldsToEnable = {
        "welcome": ["datetime"],
        "bible": ["title", "location", "slides"],
        "song": ["title", "name", "slides"],
        "title": ["title"],
        "subtitle": ["title", "subtitle"],
        "image": ["source"],
    }[changeTo];
    for (let key of fieldsToEnable) {
        document.getElementById(`item-data-table-row--${key}`)
            .classList.remove("hidden");
    }
}

function autoDate() {
    if (getCurValue("template") != "welcome")
        return;

    let date = new Date();
    let day = date.getDay();
    if (day != 0) {
        let newEpoch = date.getTime() + 1000*60*60*24 * (7 - day);
        date.setTime(newEpoch);
    }
    let datetime = `${date.getFullYear()}年${date.getMonth()}月${date.getDate()}日上午10時`;
    setValue("datetime", datetime);
}

function autoBibleFormat() {
    if (getCurValue("template") != "bible")
        return;

    let location = getCurValue("location");
    REPLACE_MAP = {
        "：": ":",
        "——": "-",
    }
    for (let i = 0; i < location.length; i++) {
        let replace = REPLACE_MAP[location[i]];
        if (replace) {
            location[i] = replace;
        }
    }
}

async function autoSlides() {
    if (getCurValue("template") != "bible")
        return;

    let loadingDiv = document.getElementById("autoSlides-loading");
    loadingDiv.classList.remove("hidden");
    
    let location = getCurValue("location");
    let resp = await fetch(`http://localhost:3000/bible-lookup?loc=${location}`);
    let text = await resp.text();
    setValue("slides", text);

    loadingDiv.classList.add("hidden");
}

function autoPreview() {
    let preview = "";
    switch (getCurValue("template")) {
        case "welcome":
            preview = getCurValue("datetime");
            break;
        case "bible":
            preview = getCurValue("title") + " - " + getCurValue("location");
            break;
        case "song":
            preview = getCurValue("title") + " - " + getCurValue("name");
            break;
        case "title":
            preview = getCurValue("title");
            break;
        case "subtitle":
            preview = getCurValue("title") + " - " + getCurValue("subtitle");
            break;
    }
    if (preview) {
        setValue("preview", preview.replaceAll("<br>", "🆕"));
    }
}

function allAuto() {
    autoDate();
    autoPreview();
    autoSlides();
}

function save() {
    let item = {};
    let table = document.getElementById("item-data-table");
    for (let row of table.rows) {
        if (!row.classList.contains("hidden")) {
            let key = row.id.replace("item-data-table-row--", "");
            let valueElement = row.children[1].children[0];

            if (key === "slides") {
                item[key] = valueElement.value.split(/N\s*\n/);
            } else {
                item[key] = valueElement.value;
            }
        }
    }

    window.opener.postMessage(
        {type: "item-editor-close", idx: itemIdx, item}, "*"
    )

    window.close();
}

const KEY_MAP = {
    "SA": allAuto,
    "SS": save,
}
window.addEventListener("keydown", e => {
    let key = (
        (e.shiftKey ? "S" : "") +
        (e.ctrlKey ? "C" : "") +
        (e.altKey ? "A" : "") +
        e.key
    )
    let handler = KEY_MAP[key];
    if (handler) {
        handler();
        e.preventDefault();
    }
})