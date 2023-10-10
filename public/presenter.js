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
let ws;
let nextSlideId = 0;

let playlistElement, slideSample;

let slideshowWindow;
function refreshSlideShow() {
    if (slideshowWindow)
        slideshowWindow.postMessage(
            {type: "change-slide", slide: curSlide}, "*"
        );
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

    div.children[0].innerHTML = slide.template;
    div.children[1].innerHTML = slide.preview;
    for (let e of Array.from(div.children)) {
        if (e.tagName === "P") {
            div.removeChild(e);
        }
    }
    if (slide.subslides) {
        for (let [s, subslide] of Object.entries(slide.subslides)) {
            p = document.createElement("p");
            p.classList.add("subslide-preview");
            p.id = `subslide-preview-i${slide.id}s${s}`;
            p.textContent = subslide.replaceAll("\n", "");
            if (curSlideObj.id == slide.id && curSubslideIdx == s) {
                p.classList.add("selected");
            }
            div.appendChild(p);
        }
    } else if (slide.numSubslides) {
        p = document.createElement("p");
        p.classList.add("subslide-count");
        p.id = `subslide-count-i${slide.id}`;
        if (curSlideObj.id == slide.id)
            p.textContent = `Subslide ${curSubslideIdx+1} of ${slide.numSubslides}`;
        else
            p.textContent = `${slide.numSubslides} subslides`;
        div.appendChild(p);
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

function blank() {
    if (slideshowWindow)
        slideshowWindow.postMessage({type: "blank"}, "*");
}

function unblank() {
    if (slideshowWindow)
        slideshowWindow.postMessage({type: "unblank"}, "*");
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
}

function renderPreview(...fields) {
    let nonEmptyFields = fields
        .filter(x => x)
        .map(s => s.replaceAll("<br>", "🆕"));
    return nonEmptyFields.join(" - ");
}

async function openPlaylist(file) {
    closePlaylist();

    const push = item => {
        id = nextSlideId++;
        playlist[id] = {id, idx: id, ...item};
    }

    let text = await file.text();
    let newline = text.includes("\r") ? "\r\n" : "\n";
    let lines = text.split(newline);
    let i = 0
    while (i < lines.length) {
        let [template, ...args] = lines[i].split(",")
        switch (template) {
            case "0": {
                let [year, month, day] = args
                push({
                    template: "welcome",
                    year, month, day,
                    preview: args.join("/"),
                })
                break;
            }
            case "1": {
                let [title, location] = args
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
                let [title, name] = args
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
                let [title, subtitle] = args
                push({
                    template: "title",
                    title, subtitle,
                    preview: renderPreview(title, subtitle),
                })
                break;
            }
            case "4": {
                let [source] = args
                push({
                    template: "image",
                    source,
                    preview: source,
                })
                break;
            }
            case "5": {
                let [videoId, start, end] = args
                push({
                    template: "youtube",
                    videoId, start, end, preview: videoId,
                })
                break;
            }
            case "6": {
                let [url] = args;
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

    document.getElementById("save-playlist-btn").disabled = false;
    document.getElementById("playlist-name").innerText = `Current playlist: ${file.name}`;
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

function addDuplicateSlideshow() {
    window.open("duplicateSlideshow.html", "", "popup");
}

// ===
// Timer / Playback Controls
// ===
let timer, timerElement, timerStart;
function togglePlayback() {
    slideshowWindow.postMessage({type: "togglePlayback"});
}

function setTimer(text) {
    timerElement.textContent = text;
}

function resetPlayback() {
    slideshowWindow.postMessage({type: "stopPlayback"});
    timerElement.textContent = ""
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
    "Cb": blank,
    "b": unblank,
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

function handlePastePlaylist(e) {
    let {playlist} = e;
    let file = new File([playlist], "playlist.txt");
    openPlaylist(file);
}

window.addEventListener("message", e => {
    switch(e.data.type) {
        case "edit-slide":
            handleEditSlideMsg(e.data);
            break;
        case "paste-playlist":
            handlePastePlaylist(e.data);
            break;
        case "set-timer":
            setTimer(e.data.text);
            break;
    }
})

async function refreshTranslations(lang) {
    if (lang) {
        localStorage.setItem("lang", lang);
    } else {
        lang = localStorage.getItem("lang") || "en";
        document.getElementById("lang-selector").value = lang;
    }
    let resp = await fetch(`./translations/${lang}.csv`);
    if (resp.ok) {
        let text = (await resp.text()).trim();
        let sep = text.includes("\r") ? "\r\n" : "\n";
        for (let line of text.split(sep)) {
            let [id, string] = line.split(",");
            try {
                document.getElementById(id).innerHTML = string;
            } catch {
                console.error(`Error setting ${id}`);
            }
        }
    }
}

window.addEventListener("load", e => {
    playlistElement = document.getElementById("slides");
    slideSample = document.getElementById("slide-sample");
    
    timerElement = document.getElementById("timer");

    refreshTranslations();
});

function wsConnect() {
    let { hostname, port } = window.location;
    ws = new WebSocket(`ws://${hostname}:${port}/ws/presenter`);
    ws.addEventListener("open", e => {
        let p = document.getElementById("server-connect-status");
        p.innerText = "Connected";
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
        let p = document.getElementById("server-connect-status");
        p.innerText = "Connection lost";
    })
}

function remoteQrOpen() {
    window.open("dialogs/remote-qr.html", "remote-qr", "width=500,height=500")
}