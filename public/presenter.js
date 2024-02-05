let curSlide = {
    template: "blank",
};
let curSlideObj = {
    template: "blank",
    id: -1,
    idx: -1,
};
let curSubslideIdx = 0;
let selectedSlide = null;
let playlist = {};
let ws = null;
let nextSlideId = 0;

let settings = JSON.parse(localStorage.getItem("settings")) || {};

let playlistElement, slideSample;

let slideshowWindow, previewIframe;
function refreshSlideShow() {
    if (slideshowWindow)
        slideshowWindow.postMessage(
            {type: "change-slide", slide: curSlide}, "*"
        );
    // if (previewIframe)
    //     previewIframe.contentWindow.postMessage(
    //         {type: "change-slide", slide: curSlide}, "*"
    //     );
}

function slideObjToSlide(slide, subslideIdx = 0) {
    switch (slide.template) {
        case "welcome": {
            let {year, month, day} = slide
            return {
                template: "welcome",
                fields: { year, month, day },
            }
        }
        case "bible": {
            let {title, location, subslides} = slide
            if (subslideIdx === 0) {
                return slideObjToSlide({
                    template: "title", title, subtitle: location}
                )
            }
            return {
                template: "bible",
                fields: { title, location, text: subslides[subslideIdx] },
            }
        }
        case "song": {
            let {title, name, subslides} = slide
            if (subslideIdx === 0) {
                return slideObjToSlide({
                    template: "title", title, subtitle: name}
                )
            }
            return {
                template: "song",
                fields: { title, name, lyrics: subslides[subslideIdx] },
            }
        }
        case "title": {
            let {title, subtitle} = slide
            if (subtitle)
                return {
                    template: "subtitle",
                    fields: { title, subtitle },
                }
            return {
                template: "title",
                fields: { title },
            }
        }
        case "image": {
            let {source} = slide
            return {
                template: "image",
                elements: [{
                    id: "img",
                    attributes: {
                        src: source,
                    }
                }]
            }
        }
        case "youtube": {
            let {videoId, start, end} = slide;
            return {
                template: "youtube",
                elements: [{id: "player", dataset: {videoId, start, end}}]
            }
        }
        case "pdf": {
            let {url} = slide;
            return {
                template: "pdf",
                elements: [{id: "canvas", dataset: {
                    url,
                    pageNum: subslideIdx + 1,
                    slideId: slide.id,
                }}]
            }
        }
    }
}

function openSlideContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    let {id, idx} = e.currentTarget.dataset;
    idx = parseInt(idx);

    let contextMenu = document.getElementById("slide-context-menu");

    for (let button of contextMenu.children) {
        switch (button.dataset.action) {
            case "edit":
                button.onclick = () => {
                    editSlide(id);
                    closeSlideContextMenu();
                }
                break;
            case "move-up":
                button.onclick = () => {
                    moveSlide(id, -1);
                    closeSlideContextMenu();
                }
                break;
            case "move-down":
                button.onclick = () => {
                    moveSlide(id, 1);
                    closeSlideContextMenu();
                }
                break;
            case "insert-above":
                button.onclick = () => {
                    addSlide(idx);
                    closeSlideContextMenu();
                }
                break;
            case "insert-below":
                button.onclick = () => {
                    addSlide(idx + 1);
                    closeSlideContextMenu();
                }
                break;
            case "delete":
                button.click = () => {
                    moveSlide(id, 0);
                    closeSlideContextMenu();
                }
        }
    }

    contextMenu.onblur = closeSlideContextMenu;

    contextMenu.style.left = e.clientX;
    contextMenu.style.top = e.clientY;
    contextMenu.classList.remove("hidden");
}
function closeSlideContextMenu() {
    let contextMenu = document.getElementById("slide-context-menu");
    contextMenu.classList.add("hidden");
}
document.addEventListener("click", closeSlideContextMenu);

function onSlideClick(e) {
    if (selectedSlide)
        selectedSlide.classList.remove("selected");
    if (curSlideObj.subslides)
        document.getElementById(`subslide-preview-i${curSlideObj.id}s${curSubslideIdx}`)
            .classList.remove("selected");
    else if (curSlideObj.numSubslides)
        document.getElementById(`subslide-count-i${curSlideObj.id}`)
            .textContent = `${curSlideObj.numSubslides} subslides`;

    let id = parseInt(e.currentTarget.dataset.id);
    curSlideObj = playlist[id];
    curSlideObj.idx = parseInt(e.currentTarget.dataset.idx);

    let match = e.target.id.match(/^subslide-preview-i\d+s(\d+)$/);
    if (match) {
        curSubslideIdx = parseInt(match[1]);
    } else {
        curSubslideIdx = 0;
    }
    curSlide = slideObjToSlide( curSlideObj, curSubslideIdx );

    e.currentTarget.classList.add("selected");
    if (curSlideObj.subslides)
        document.getElementById(`subslide-preview-i${id}s${curSubslideIdx}`)
            .classList.add("selected");
    else if (curSlideObj.numSubslides)
        document.getElementById(`subslide-count-i${id}`)
            .textContent = `Subslide 1 of ${curSlideObj.numSubslides}`;
    selectedSlide = e.currentTarget;

    refreshSlideShow()
}

function addSlideToDOM(id, idx = -1) {
    let div = slideSample.cloneNode(true);

    div.classList.remove("hidden");
    div.id = "";
    div.dataset.id = id;
    div.dataset.idx = idx === -1 ? playlistElement.children.length : idx;

    div.addEventListener("click", onSlideClick);
    div.addEventListener("contextmenu", openSlideContextMenu);

    if (idx === -1) {
        playlistElement.appendChild(div);
    } else if (idx === 0) {
        playlistElement.insertAdjacentElement("afterBegin", div);
    } else {
        playlistElement.children[idx - 1].insertAdjacentElement("afterEnd", div);
    }

    return div;
}
function editSlideInDOM(slide) {
    let idx = slide.idx;
    let div = playlistElement.children[idx];

    for (let e of Array.from(div.children)) {
        if (e.tagName == "H4") {
            e.textContent = slide.template;
        } else if (e.tagName == "H2") {
            e.textContent = slide.preview;
        } else {
            div.removeChild(e);
        }
    }

    if (slide.subslides) {
        for (let [s, subslide] of Object.entries(slide.subslides)) {
            let p = document.createElement("p");
            p.classList.add("subslide-preview");
            p.id = `subslide-preview-i${slide.id}s${s}`;
            p.textContent = subslide.replaceAll("\n", "");
            if (curSlideObj.id == slide.id && curSubslideIdx == s) {
                p.classList.add("selected");
            }
            div.appendChild(p);
        }
    } else if (slide.numSubslides) {
        let p = document.createElement("p");
        p.classList.add("subslide-count");
        p.id = `subslide-count-i${slide.id}`;
        if (curSlideObj.id == slide.id)
            p.textContent = `Subslide ${curSubslideIdx+1} of ${slide.numSubslides}`;
        else
            p.textContent = `${slide.numSubslides} subslides`;
        div.appendChild(p);
    } else if (slide.template == "youtube") {
        let controls = document.getElementById("playback-controls-sample").cloneNode(true);
        controls.id = `playback-controls-i${slide.id}`;
        controls.classList.remove("hidden");

        controls.children[0].addEventListener("click", togglePlayback);
        controls.children[1].addEventListener("click", resetPlayback);

        div.appendChild(controls);
    }
}
function moveSlide(id, offset) {
    let oldIndex = parseInt(playlist[id].idx);

    if (offset === 0) { // Delete slide
        delete playlist[id];
        playlistElement.removeChild( playlistElement.children[oldIndex] );
    } else {
        let newIndex = oldIndex + offset;
        if (newIndex < 0 || newIndex >= playlist.length)
            return;

        let where = offset > 0 ? "afterEnd" : "beforeBegin";
        playlistElement.children[newIndex].insertAdjacentElement(
            where, playlistElement.children[oldIndex]
        );
    }

    // Reevaluate the index of every slide
    for (let [idx, e] of Object.entries(Array.from(playlistElement.children))) {
        e.dataset.idx = idx;
        playlist[e.dataset.id].idx = idx;
        if (curSlideObj.id == e.dataset.id) {
            curSlideObj.idx = idx;
        }
    }
}

// ===
// Slide Controls
// ===
function nextSlide() {
    if (curSlideObj.idx === playlist.length - 1)
        return;
    let nextSlide = playlistElement.children[curSlideObj.idx + 1]
    nextSlide.click();
}
function prevSlide() {
    if (curSlideObj.idx === 0)
        return;
    let prevSlide = playlistElement.children[curSlideObj.idx - 1]
    prevSlide.click();
}

function toggleBlank() {
    if (slideshowWindow)
        slideshowWindow.postMessage({type: "blank"}, "*");
}

function prevSubslide() {
    if (curSubslideIdx <= 0)
        return prevSlide();

    if (curSlideObj.subslides) {
        document.getElementById(`subslide-preview-i${curSlideObj.id}s${curSubslideIdx}`)
            .classList.remove("selected");
        curSlide = slideObjToSlide(curSlideObj, --curSubslideIdx);
        document.getElementById(`subslide-preview-i${curSlideObj.id}s${curSubslideIdx}`)
            .classList.add("selected");
    } else if (curSlideObj.numSubslides) {
        curSlide = slideObjToSlide(curSlideObj, --curSubslideIdx);
        document.getElementById(`subslide-count-i${curSlideObj.id}`)
            .textContent = `Subslide ${curSubslideIdx+1} of ${curSlideObj.numSubslides}`;
    } else {
        return prevSlide();
    }

    refreshSlideShow();
}
function nextSubslide() {
    if (curSlideObj.subslides) {
        if (curSubslideIdx >= curSlideObj.subslides.length - 1)
            return nextSlide();

        document.getElementById(`subslide-preview-i${curSlideObj.id}s${curSubslideIdx}`)
            .classList.remove("selected");
        curSlide = slideObjToSlide(curSlideObj, ++curSubslideIdx);
        document.getElementById(`subslide-preview-i${curSlideObj.id}s${curSubslideIdx}`)
            .classList.add("selected");
    } else if (curSlideObj.numSubslides) {
        if (curSubslideIdx >= curSlideObj.numSubslides - 1)
            return nextSlide();

        curSlide = slideObjToSlide(curSlideObj, ++curSubslideIdx);
        document.getElementById(`subslide-count-i${curSlideObj.id}`)
            .textContent = `Subslide ${curSubslideIdx+1} of ${curSlideObj.numSubslides}`;
    } else {
        return nextSlide();
    }

    refreshSlideShow();
}
function jumpToSubslide() {
    if (!curSlideObj.subslides) return;

    let searchTerm = window.prompt("Enter a search term:");
    let resultIdx = curSlideObj.subslides.findIndex(
        subslide => subslide.includes(searchTerm)
    );
    if (resultIdx === -1) return;

    document.getElementById(`subslide-preview-i${curSlideObj.id}s${curSubslideIdx}`)
        .classList.remove("selected");
    curSubslideIdx = resultIdx
    curSlide = slideObjToSlide(curSlideObj, curSubslideIdx);
    document.getElementById(`subslide-preview-i${curSlideObj.id}s${curSubslideIdx}`)
        .classList.add("selected");
    refreshSlideShow()
}

function editSlide(id = null) {
    if (id === null) {
        if (curSlideObj.id == -1) {
            alert("Select a slide first!");
            return;
        } else {
            id = curSlideObj.id;
        }
    }

    let url = "dialogs/edit-slide.html";
    let dialog = window.open(url, "edit-slide", "width=800,height=500");
    setTimeout(() => {
        dialog.postMessage(
            { type: "init", slide: playlist[id] },
            "*"
        );
    }, 1000);
}
function addSlide(idx = Object.entries(playlist).length) {
    let dialog = window.open("dialogs/edit-slide.html", "edit-item", "width=800,height=500");
    setTimeout(() => {
        dialog.postMessage(
            { type: "init", slide: {id: "new", idx, template: ""} },
            "*"
        );
    }, 1000);
}


// ===
// Playlist Controls
// ===
function onOpenBtnClick() {
    document.getElementById("playlist-open-picker").click()
}

function closePlaylist() {
    playlistElement.replaceChildren();
    playlist = {};
    nextSlideId = 0;

    document.getElementById("save-playlist-btn").classList.add("hidden");
    document.getElementById("close-playlist-btn").classList.add("hidden");
    document.getElementById("playlist-name").textContent = "";

    document.getElementById("playlist-setup-section").classList.remove("hidden");
}

function renderPreview(...fields) {
    let nonEmptyFields = fields
        .filter(x => x)
        .map(s => s.replaceAll("<br>", "🆕"));
    return nonEmptyFields.join(" - ");
}

async function openPlaylist(file) {
    if (!file)
        return;

    closePlaylist();

    const push = item => {
        id = nextSlideId++;
        playlist[id] = {id, idx: id, ...item};
    }
    const limitArgs = (args, lim) => {
        if (args.length <= lim)
            return args;

        let newArgs = args.slice(0, lim - 1);
        newArgs.push( args.slice(lim - 1).join(",") );
        return newArgs;
    }

    let text = await file.text();
    let newline = text.includes("\r") ? "\r\n" : "\n";
    let lines = text.split(newline);
    let i = 0
    while (i < lines.length) {
        let [template, ...args] = lines[i].split(",")
        switch (template) {
            case "0": {
                let [year, month, day] = limitArgs(args, 3);
                push({
                    template: "welcome",
                    year, month, day,
                    preview: args.join("/"),
                })
                break;
            }
            case "1": {
                let [title, location] = limitArgs(args, 2);
                let subslides = ["<Title Subslide>"]
                let subslide = ""
                do {
                    subslide += lines[++i] + "\n"
                    if ( lines[i].match(/(N|E)$/) ) {
                        subslides.push(subslide.slice(0, -2)) // Remove N|E and \n
                        subslide = ""
                    }
                } while (!lines[i].endsWith("E"))
                push({
                    template: "bible",
                    title, location, subslides,
                    preview: renderPreview(title, location),
                })
                break;
            }
            case "2": {
                let [title, name] = limitArgs(args, 2);
                let subslides = ["<Title Subslide>"]
                let subslide = ""
                do {
                    subslide += lines[++i] + "\n"
                    if ( lines[i].match(/N|E$/) ) {
                        subslides.push(subslide.slice(0, -2)) // Remove N|E and \n
                        subslide = ""
                    }
                } while (!lines[i].endsWith("E"))
                push({
                    template: "song",
                    title, name, subslides,
                    preview: renderPreview(title, name),
                })
                break;
            }
            case "3": {
                let [title, subtitle] = limitArgs(args, 2);
                push({
                    template: "title",
                    title, subtitle,
                    preview: renderPreview(title, subtitle),
                })
                break;
            }
            case "4": {
                let [source] = limitArgs(args, 1);
                push({
                    template: "image",
                    source,
                    preview: source,
                })
                break;
            }
            case "5": {
                let [videoId, start, end] = limitArgs(args, 3);
                push({
                    template: "youtube",
                    videoId, start, end, preview: videoId,
                })
                break;
            }
            case "6": {
                let [url] = limitArgs(args, 1);;
                push({
                    template: "pdf",
                    url, numSubslides: Infinity, preview: url
                });
                break;
            }
        }
        i++;
    }

    for (let item of Object.values(playlist)) {
        addSlideToDOM(item.id, item.idx);
        editSlideInDOM(item);
    }

    document.getElementById("save-playlist-btn").classList.remove("hidden");
    document.getElementById("close-playlist-btn").classList.remove("hidden");
    document.getElementById("playlist-name").textContent = file.name;

    document.getElementById("playlist-setup-section").classList.add("hidden");
}

function pastePlaylist() {
    window.open("dialogs/paste-playlist.html", "paste-playlist", "width=800,height=700");
}

function savePlaylist() {
    let textFile = "";
    for (let element of playlistElement.children) {
        let slide = playlist[element.dataset.id];
        switch (slide.template) {
            case "welcome":
                textFile += `0,${slide.year},${slide.month},${slide.day}\n`;
                break;
            case "bible":
                textFile += `1,${slide.title},${slide.location}\n`
                for (let [i,subslide] of Object.entries(slide.subslides)) {
                    if (i == 0) continue;
                    textFile += `${subslide}N\n`;
                }
                textFile = textFile.replace(/N\n$/, "E\n");
                break;
            case "song":
                textFile += `2,${slide.title},${slide.name}\n`
                for (let [i,subslide] of Object.entries(slide.subslides)) {
                    if (i == 0) continue;
                    textFile += `${subslide}N\n`;
                }
                textFile = textFile.replace(/N\n$/, "E\n");
                break;
            case "title":
                if (slide.subtitle)
                    textFile += `3,${slide.title},${slide.subtitle}\n`;
                else
                    textFile += `3,${slide.title}\n`;
                break;
            case "image":
                textFile += `4,${slide.source}\n`;
                break;
            case "youtube":
                let list = [5, slide.videoId, slide.start, slide.end].filter(x => x);
                textFile += list.join(",") + "\n";
                break;
            case "pdf":
                textFile += `6,${slide.url}\n`;
                break;
        }
    };
    let exportFile = new File([textFile], "playlist.txt");
    let url = URL.createObjectURL(exportFile);
    let a = document.createElement("a");
    a.href = url;
    a.download = exportFile.name;
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}


// ===
// Preview Controls
// ===
async function setupPreview() {
    let captureStream = await navigator.mediaDevices.getDisplayMedia();
    let video = document.getElementById("preview-frame");
    video.srcObject = captureStream;
    video.play();
    document.getElementById("setup-preview-btn").hidden = true;
}


// ===
// Slideshow Controls
// ===
function openSlideshow() {
    slideshowWindow = window.open("slideshow.html", "churchPresenterSlideshow", "popup");
    setTimeout(refreshSlideShow, 1000); //Wait 1s for window to initialise
}

function closeSlideshow() {
    slideshowWindow.close();
    slideshowWindow = null;
}

// ===
// Timer / Playback Controls
// ===
let curPlaybackControls;
function togglePlayback(e) {
    e.stopPropagation();

    let slideId = e.currentTarget.parentElement.parentElement.dataset.id;
    let slide = playlist[slideId];
    slideshowWindow.postMessage({
        type: "togglePlayback",
        videoId: slide.videoId, start: slide.start, end: slide.end,
    });

    if (curPlaybackControls !== e.currentTarget.parentElement) {
        if (curPlaybackControls)
            curPlaybackControls.children[2].textContent = "";
        curPlaybackControls = e.currentTarget.parentElement;
    }
}

function setTimeDisplay({text}) {
    curPlaybackControls.children[2].textContent = text;
}

function resetPlayback(e) {
    slideshowWindow.postMessage({type: "stopPlayback"});
    curPlaybackControls.children[2].textContent = "";
}

// ===
// Keyboard Shortcuts
// ===
const KEY_MAP = {
    "ArrowRight": nextSubslide,
    "ArrowDown": nextSubslide,
    "PageDown": nextSubslide,
    "ArrowLeft": prevSubslide,
    "ArrowUp": prevSubslide,
    "PageUp": prevSubslide,
    "CArrowRight": nextSlide,
    "CArrowDown": nextSlide,
    "CPageDown": nextSlide,
    "CArrowLeft": prevSlide,
    "CArrowUp": prevSlide,
    "CPageUp": prevSlide,
    "b": toggleBlank,
    "Ce": editSlide,
    "Ca": addSlide,
    "j": jumpToSubslide,
    "CSArrowUp": () => moveSlide(curSlideObj.id, -1),
    "CSArrowDown": () => moveSlide(curSlideObj.id, 1),
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


// ===
// Message Receiving
// ===
function handleEditSlideMsg(data) {
    let {slide} = data;
    let {id, idx} = slide;

    if (id === "new") {
        id = nextSlideId++;
        playlist[id] = {...slide, id, idx};
        addSlideToDOM(id, idx);
    } else {
        slide = {...playlist[id], ...slide};
        playlist[id] = slide;

        if (curSlideObj.id == id) {
            curSlideObj = slide;
            curSlide = slideObjToSlide(slide, curSubslideIdx);
            refreshSlideShow();
        }
    }

    editSlideInDOM(playlist[id]);
}

function handlePastePlaylist(data, source) {
    let {playlist} = data;
    let file = new File([playlist], "playlist.txt");
    openPlaylist(file)
        .catch(error => source.postMessage({type: "paste-error", error}))
        .then(() => source.postMessage({type: "paste-success"}));
}

function saveSettings(data) {
    let newSettings = data.settings;
    localStorage.setItem("settings", JSON.stringify(newSettings));
    settings = newSettings;

    refreshTranslations();
}

window.addEventListener("message", e => {
    switch(e.data.type) {
        case "edit-slide":
            handleEditSlideMsg(e.data);
            break;
        case "paste-playlist":
            handlePastePlaylist(e.data, e.source);
            break;
        case "set-time-display":
            setTimeDisplay(e.data);
            break;
        case "save-settings":
            saveSettings(e.data);
            break;
    }
})

const TEXT_NODE_TYPES = ["H1", "H2", "H3", "H4", "H5", "H6", "P"]
async function refreshTranslations() {
    let lang = settings.lang || "en";
    let resp = await fetch(`./translations/${lang}.csv`);
    if (resp.ok) {
        let text = (await resp.text()).trim();
        let sep = text.includes("\r") ? "\r\n" : "\n";
        for (let line of text.split(sep)) {
            let [id, string] = line.split(",", 2);
            try {
                let e = document.getElementById(id);
                if (
                    TEXT_NODE_TYPES.includes(e.nodeName) ||
                    (e.nodeName === "DIV" && e.classList.contains("text-button"))
                )
                    e.textContent = string;
                else
                    e.title = string;
            } catch {
                console.error(`Error setting ${id}`);
            }
        }
    }
}

async function checkVersion() {
    let resp = await fetch("/api/update/check");
    if (!resp.ok)
        throw Error();
    let {curVersion, latestVersion} = await resp.json();
    let curYear = new Date().getFullYear();

    if (!curVersion.version || !curVersion.date) {
        let versionStr = `Church Presenter © Sunny Yan ${curYear}`;
        document.getElementById("version-info").textContent = versionStr;
        return;
    }

    let formattedDate = new Date(curVersion.date).toLocaleDateString(
        undefined, {day: "numeric", month: "short", "year": "numeric"}
    );
    let versionStr = `Church Presenter ${curVersion.version} (${formattedDate}) © Sunny Yan ${curYear}`;
    document.getElementById("version-info").textContent = versionStr;

    if (curVersion.version !== latestVersion.version)
        openUpdater();
}
const openUpdater = e => window.open("dialogs/updater.html", "updater", "width=500,height=500")

function checkServer() {
    fetch("/api")
        .catch(err => document.body.dataset.serverlessMode = true)
        .then(res => document.body.dataset.serverlessMode = !res.ok);
}

window.addEventListener("load", e => {
    playlistElement = document.getElementById("slides");
    slideSample = document.getElementById("slide-sample");

    // previewIframe = document.getElementById("preview-iframe");
    
    timerElement = document.getElementById("timer");

    refreshTranslations();

    checkVersion();
    checkServer();
});

function wsConnect() {
    let { hostname, port } = window.location;
    ws = new WebSocket(`ws://${hostname}:${port}/ws/presenter`);
    ws.addEventListener("open", e => {
        let dot = document.getElementById("ws-connection-dot");
        dot.dataset.status = "connected";
    });
    ws.addEventListener("message", e => {
        let {origin, message} = JSON.parse(e.data);
        if (message.type === "shortkey") {
            let handler = KEY_MAP[message.key];
            if (handler)
                handler();
        }
    });
    ws.addEventListener("close", e => {
        let dot = document.getElementById("ws-connection-dot");
        dot.dataset.status = "disconnected";
    })
}

function openRemoteQr() {
    if (!ws)
        wsConnect();
    window.open("dialogs/remote-qr.html", "remote-qr", "width=500,height=500")
}

function openSettings() {
    let settingsWindow = window.open(
        "dialogs/settings.html", "settings", "width=500,height=500"
    );
    setTimeout(
        () => settingsWindow.postMessage(settings, "*"), 1000
    );
}