let editorMode = "quick";

function dataTableToItem() {
    let item = {};
    let table = document.getElementById("item-data-table");
    for (let row of table.rows) {
        if (!row.classList.contains("hidden")) {
            let key = row.id.replace("item-data-table-row--", "");
            let valueElement = row.children[1].children[0];

            if (key === "slides") {
                item[key] = valueElement.value.split(/N\s*\n/);
                item[key].unshift("<Title Slide>");
            } else if (key === "numSlides") {
                item[key] = valueElement.value || Infinity;
            } else {
                item[key] = valueElement.value;
            }
        }
    }
    return item;
}
function itemToDataTable(itemData) {
    let table = document.getElementById("item-data-table");
    table.classList.add("hidden");
    for (let row of table.rows) {
        let key = row.id.replace("item-data-table-row--","");
        let val = itemData[key];

        if (val === undefined) {
            if (key !== "preview") // Preview should not be ever hidden
                row.classList.add("hidden");
            continue;
        }

        let valueElement = row.children[1].children[0];
        if (key === "slides") {
            valueElement.value = val.splice(1).join("N\n");
        } else {
            valueElement.value = val;
        }
    }
    onTemplateChange();
    table.classList.remove("hidden");
}

window.addEventListener("message", e => {
    if (e.data.type != "init")
        return;
    
    let itemData = e.data.item;

    itemToDataTable(itemData);

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

function switchMode(button) {
    let jsonEditor = document.getElementById("json-editor")

    if (button.dataset.mode === "quick") {
        let itemData;
        try {
            itemData = JSON.parse(jsonEditor.value);
        } catch (e) {
            console.error(e);
            alert("Invalid JSON, please correct before changing");
            return;
        }
        for (let c of button.parentElement.children)
            c.classList.remove("selected");
        button.classList.add("selected");
        jsonEditor.classList.add("hidden");
        itemToDataTable(itemData);
        document.getElementById("item-data-table").classList.remove("hidden");
    } else { // "json"
        for (let c of button.parentElement.children)
            c.classList.remove("selected");
        button.classList.add("selected");
        document.getElementById("item-data-table").classList.add("hidden");
        jsonEditor.value = JSON.stringify(dataTableToItem());
        jsonEditor.classList.remove("hidden");
    }

    editorMode = button.dataset.mode;
}

function onTemplateChange() {
    let changeTo = document.getElementById("template-selector").value;
    let fieldsToEnable = {
        "welcome": ["datetime"],
        "bible": ["title", "location", "slides"],
        "song": ["title", "name", "slides"],
        "title": ["title", "subtitle"],
        "image": ["source"],
        "youtube": ["videoId","start","end"],
        "pdf": ["url", "numSlides"],
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
    let processed = "";

    REPLACE_MAP = {
        "：": ":",
        "—": "-",
    }
    for (let c of location) {
        processed += REPLACE_MAP[c] || c;
    }

    setValue("location", processed);
}

function autoTimeConvert() {
    let start = getCurValue("start").split(":");
    if (start.length === 3) {
        let [hour, min, sec] = start;
        setValue("start", hour * 3600 + min * 60 + parseFloat(sec));
    } else if (start.length === 2) {
        let [min, sec] = start;
        setValue("start", min * 60 + parseFloat(sec));
    }

    let end = getCurValue("end").split(":");
    if (end.length === 3) {
        let [hour, min, sec] = end;
        setValue("end", hour * 3600 + min * 60 + parseFloat(sec));
    } else if (start.length === 2) {
        let [min, sec] = end;
        setValue("end", min * 60 + parseFloat(sec));
    }
}

async function autoSlides(force = false) {
    if (getCurValue("template") != "bible")
        return;
    // If slides are already filled, don't overwrite with all auto
    if (!force && getCurValue("slides"))
        return;

    let loadingDiv = document.getElementById("autoSlides-loading");
    loadingDiv.classList.remove("hidden");
    
    let location = getCurValue("location");
    let resp = await fetch(window.origin + `/api/bible-lookup?loc=${location}`);
    let text = await resp.text();
    if (resp.ok) {
        setValue("slides", text);
    } else {
        alert("Error: " + text);
    }

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
            let subtitle = getCurValue("subtitle");
            preview = subtitle
                ? getCurValue("title") + " - " + subtitle
                : getCurValue("title");
            break;
        case "image":
            preview = getCurValue("source");
            break;
        case "youtube":
            preview = getCurValue("videoId");
            break;
        case "pdf":
            preview = getCurValue("url");
            break;
    }
    if (preview) {
        setValue("preview", preview.replaceAll("<br>", "🆕"));
    }
}

function allAuto() {
    if (editorMode === "json")
        return;

    autoDate();
    autoPreview();
    autoTimeConvert();
    autoSlides();
    return true;
}

function save() {
    let item;
    try {
        item = editorMode === "quick"
            ? dataTableToItem()
            : JSON.parse(document.getElementById("json-editor").value);
    } catch (e) {
        console.error(e);
        alert("Error parsing JSON, please fix before saving");
        return true;
    }

    window.opener.postMessage(
        {type: "edit-item", item}, "*"
    )

    window.close();

    return true;
}

const KEY_MAP = {
    "Ca": allAuto,
    "Cs": save,
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
        if (handler())
            e.preventDefault();
    }
})