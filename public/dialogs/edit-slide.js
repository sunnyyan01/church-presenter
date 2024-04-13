let editorMode = "quick";

function dataTableToSlide() {
    let slide = {};
    let table = document.getElementById("slide-data-table");
    for (let row of table.rows) {
        if (!row.classList.contains("hidden")) {
            let key = row.id.replace("slide-data-table-row--", "");
            let valueElement = row.children[1].children[0];

            if (key === "subslides") {
                slide[key] = valueElement.value.split(/N\s*\n/);
                slide[key].unshift("<Title Slide>");
            } else if (key === "numSubslides") {
                slide[key] = valueElement.value || 1;
            } else {
                slide[key] = valueElement.value;
            }
        }
    }
    return slide;
}
function slideToDataTable(slide) {
    let table = document.getElementById("slide-data-table");
    table.classList.add("hidden");
    for (let row of table.rows) {
        let key = row.id.replace("slide-data-table-row--","");
        let val = slide[key];

        if (val === undefined) {
            if (key !== "preview") // Preview should not be ever hidden
                row.classList.add("hidden");
            continue;
        }

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
    if (e.data.type != "init")
        return;
    
    let slide = e.data.slide;

    slideToDataTable(slide);

    document.getElementById("save-btn").classList.remove("hidden");
})

function getCurValue(key) {
    let row = document.getElementById(`slide-data-table-row--${key}`);
    return row.children[1].children[0].value;
}
function setValue(key, val) {
    let row = document.getElementById(`slide-data-table-row--${key}`);
    row.children[1].children[0].value = val;
}

function switchMode(button) {
    let jsonEditor = document.getElementById("json-editor")

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
    let fieldsToEnable = {
        "welcome": ["year", "month", "day"],
        "bible": ["title", "location", "version", "subslides"],
        "song": ["title", "name", "subslides"],
        "title": ["title", "subtitle"],
        "embed": ["url", "numSubslides"],
        "youtube": ["videoId","start","end","subtitles"],
    }[changeTo] || [];
    for (let key of fieldsToEnable) {
        document.getElementById(`slide-data-table-row--${key}`)
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
    let url = window.origin + `/api/bible-lookup?loc=${location}`;
    if (version)
        url += `&version=${version}`
    let resp = await fetch(url);
    let text = await resp.text();
    if (resp.ok) {
        setValue("subslides", text);
    } else {
        alert("Error: " + text);
    }

    loadingDiv.classList.add("hidden");
}

const TEMPLATE_TO_ARGS = {
    "welcome": ["year", "month", "day"],
    "bible": ["title", "location"],
    "song": ["title", "name"],
    "title": ["title", "subtitle"],
    "embed": ["url"],
    "youtube": ["videoId"],
}
function autoPreview() {
    let preview = TEMPLATE_TO_ARGS[getCurValue("template")]
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
    autoSlides();
    return true;
}

function save() {
    let slide;
    try {
        slide = editorMode === "quick"
            ? dataTableToSlide()
            : JSON.parse(document.getElementById("json-editor").value);
    } catch (e) {
        console.error(e);
        alert("Error parsing JSON, please fix before saving");
        return true;
    }

    window.opener.postMessage(
        {type: "edit-slide", slide}, "*"
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
        (e.ctrlKey ? "C" : "") +
        (e.altKey ? "A" : "") +
        (e.shiftKey ? "S" : "") +
        e.key
    )
    let handler = KEY_MAP[key];
    if (handler) {
        if (handler())
            e.preventDefault();
    }
})