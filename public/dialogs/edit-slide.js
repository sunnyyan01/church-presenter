let editorMode = "quick";
let jsonEditor;

const TEMPLATE_ARGS = {
    "welcome": ["year", "month", "day", "preview"],
    "bible": ["title", "location", "version", "subslides", "preview"],
    "song": ["title", "name", "subslides", "preview"],
    "title": ["title", "subtitle", "preview"],
    "embed": ["url", "numSubslides", "preview"],
    "youtube": ["videoId","start","end","subtitles", "preview"],
}

function pageToSlide() {
    if (editorMode === "quick") return dataTableToSlide();
    else /* json */ return JSON.parse(jsonEditor.value);
}

function dataTableToSlide() {
    let slide = {};
    let table = document.getElementById("slide-data-table");
    for (let row of table.rows) {
        if (row.dataset.state !== "hide") {
            let key = row.dataset.key;
            let value = row.children[1].children[0].value;

            if (!value && row.dataset.state === "drop") continue;

            if (key === "subslides") {
                slide[key] = value.split(/N\s*\n/);
                slide[key].unshift("<Title Slide>");
            } else if (key === "numSubslides") {
                slide[key] = value || 1;
            } else {
                slide[key] = value;
            }
        }
    }
    return slide;
}

function slideToPage(slide) {
    if (editorMode === "quick") {
        slideToDataTable(slide);
    } else { // json
        try {
            jsonEditor.value = JSON.stringify(slide);
        } catch (e) {
            console.error(e);
            alert("Invalid JSON, please correct before changing");
            throw e;
        }
    }
}

function slideToDataTable(slide) {
    let table = document.getElementById("slide-data-table");
    table.classList.add("hidden");
    for (let row of table.rows) {
        let key = row.dataset.key;
        let val = slide[key];

        if (val === undefined) continue;

        let valueElement = row.children[1].children[0];
        if (key === "subslides") {
            valueElement.value = val.splice(1).join("N\n");
        } else {
            valueElement.value = val;
        }
    }
    onTemplateChange();
    table.classList.remove("hidden");
}

window.addEventListener("message", e => {
    if (e.data.type === "init") {
        let slide = e.data.slide;
        slideToDataTable(slide);
        document.getElementById("save-btn").classList.remove("hidden");
    } else if (e.source.name === "saved-slides") {
        let slide = e.data;
        slide.id = getCurValue("id");
        slide.idx = getCurValue("idx");
        slideToDataTable(e.data);
        jsonEditor.value = JSON.stringify(e.data, undefined, 2);
    }
})

function getCurValue(key) {
    if (editorMode === "quick") {
        let row = document.getElementById(`slide-data-table-row--${key}`);
        return row.children[1].children[0].value;
    } else { //json
        return JSON.parse(jsonEditor.value)[key];
    }
}
function setValue(key, val) {
    let row = document.getElementById(`slide-data-table-row--${key}`);
    row.children[1].children[0].value = val;
}

function switchMode(button) {
    if (button.dataset.mode === "quick") {
        let slide;
        try {
            slide = JSON.parse(jsonEditor.value);
        } catch (e) {
            console.error(e);
            alert("Invalid JSON, please correct before changing");
            return;
        }
        for (let c of button.parentElement.children)
            c.classList.remove("selected");
        button.classList.add("selected");
        jsonEditor.classList.add("hidden");
        slideToDataTable(slide);
        document.getElementById("slide-data-table").classList.remove("hidden");
    } else { // "json"
        for (let c of button.parentElement.children)
            c.classList.remove("selected");
        button.classList.add("selected");
        document.getElementById("slide-data-table").classList.add("hidden");
        jsonEditor.value = JSON.stringify(dataTableToSlide(), undefined, 2);
        jsonEditor.classList.remove("hidden");
    }

    editorMode = button.dataset.mode;
}

function onTemplateChange() {
    let changeTo = document.getElementById("template-selector").value;
    let fieldsToEnable = TEMPLATE_ARGS[changeTo] || [];
    const alwaysEnabled = ["template", "preview"];
    let table = document.getElementById("slide-data-table");
    for (let row of table.rows) {
        if (!row.dataset.key) continue;

        if (
            fieldsToEnable.includes(row.dataset.key) ||
            alwaysEnabled.includes(row.dataset.key)
        ) {
            row.dataset.state = "show";
        } else {
            let inputElement = row.getElementsByTagName("input")[0];
            if (inputElement && inputElement.value) {
                row.dataset.state = "drop";
            } else {
                row.dataset.state = "hide";
            }
        }
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

async function autoSubslides(force = false) {
    if (getCurValue("template") != "bible")
        return;
    // If subslides are already filled, don't overwrite with all auto
    if (!force && getCurValue("subslides"))
        return;

    let loadingDiv = document.getElementById("autoSubslides-loading");
    loadingDiv.classList.remove("hidden");
    
    let location = getCurValue("location");
    let version = getCurValue("version");
    let url = (
        sessionStorage.getItem("serverlessMode") === "true"
        ? "https://churchpresenterapi.azurewebsites.net/api/bible-lookup"
        : "/api/bible-lookup"
    )
    let search = new URLSearchParams({loc: location, version: version});
    let resp = await fetch(url + "?" + search.toString());
    let text = await resp.text();
    if (resp.ok) {
        setValue("subslides", text);
    } else {
        alert("Error: " + text);
    }

    loadingDiv.classList.add("hidden");
}

const TEMPLATE_PREVIEW = {
    "welcome": ["year", "month", "day"],
    "bible": ["title", "location"],
    "song": ["title", "name"],
    "title": ["title", "subtitle"],
    "embed": ["url"],
    "youtube": ["videoId"],
}
function autoPreview() {
    let preview = TEMPLATE_PREVIEW[getCurValue("template")]
        .map(getCurValue)
        .filter(x => x)
        .join(" - ")
        .replaceAll("<br>", "🆕");
    setValue("preview", preview);
}

function allAuto() {
    if (editorMode === "json")
        return;

    autoDate();
    autoPreview();
    autoTimeConvert();
    autoSubslides();
}

function loadSavedSlide() {
    let search = new URLSearchParams({
        folder: "saved-slides",
        action: "load",
        overwriteWarn: getCurValue("id") !== "new"
    });
    let win = window.open("file-picker.html?" + search.toString(), "saved-slides", "width=500,height=500");
}
function saveSlide() {
    let slide = pageToSlide();
    let search = new URLSearchParams({
        folder: "saved-slides",
        action: "save",
    });
    let win = window.open("file-picker.html?" + search.toString(), "saved-slides", "width=500,height=500");
    delete slide.id;
    delete slide.idx;
    setTimeout(() => win.postMessage(slide), 1000);
}

function save() {
    let slide = pageToSlide();

    window.opener.postMessage(
        {type: "edit-slide", slide}, "*"
    )

    window.close();
}

const KEY_MAP = {
    "CSa": allAuto,
    "Cs": save,
}
window.addEventListener("keydown", e => {
    let key = (
        (e.ctrlKey ? "C" : "") +
        (e.altKey ? "A" : "") +
        (e.shiftKey ? "S" : "") +
        e.key
    )
    let handler = KEY_MAP[key];
    if (handler) {
        handler();
        e.preventDefault();
    }
})

window.addEventListener("load", () => {
    jsonEditor = document.getElementById("json-editor");

    loadTranslations();
})