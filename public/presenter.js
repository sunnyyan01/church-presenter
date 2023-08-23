let curSlide = {
    template: "blank",
};
let curPlaylistItem = {
    template: "blank",
    id: -1,
    idx: -1,
};
let curSlideIdx = 0;
let selectedItem = null;
let playlist = {};
let ws;
let nextItemId = 0;

let playlistElement, playlistItemSample;

let slideshowWindow;
function refreshSlideShow() {
    if (slideshowWindow)
        slideshowWindow.postMessage(
            {type: "change-slide", slide: curSlide}, "*"
        );
}

function playlistItemToSlide(item, slideIdx = 0) {
    switch (item.template) {
        case "welcome": {
            let {year, month, day} = item
            return {
                template: "welcome",
                fields: { year, month, day },
            }
        }
        case "bible": {
            let {title, location, slides} = item
            if (slideIdx === 0) {
                return playlistItemToSlide({
                    template: "title", title, subtitle: location}
                )
            }
            return {
                template: "bible",
                fields: { title, location, text: slides[slideIdx] },
            }
        }
        case "song": {
            let {title, name, slides} = item
            if (slideIdx === 0) {
                return playlistItemToSlide({
                    template: "title", title, subtitle: location}
                )
            }
            return {
                template: "song",
                fields: { title, name, lyrics: slides[slideIdx] },
            }
        }
        case "title": {
            let {title, subtitle} = item
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
            let {source} = item
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
            let {videoId} = item;
            return {
                template: "youtube",
                elements: [{id: "player", dataset: {videoId}}]
            }
        }
        case "pdf": {
            let {url} = item;
            return {
                template: "pdf",
                elements: [{id: "canvas", dataset: {
                    url,
                    pageNum: slideIdx + 1,
                    itemId: item.id,
                }}]
            }
        }
    }
}

function openPlaylistItemContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    let {id, idx} = e.currentTarget.dataset;
    idx = parseInt(idx);

    let contextMenu = document.getElementById("playlist-item-context-menu");

    for (let button of contextMenu.children) {
        switch (button.dataset.action) {
            case "edit":
                button.onclick = () => {
                    editItem(id);
                    closePlaylistItemContextMenu();
                }
                break;
            case "move-up":
                button.onclick = () => {
                    movePlaylistItem(id, -1);
                    closePlaylistItemContextMenu();
                }
                break;
            case "move-down":
                button.onclick = () => {
                    movePlaylistItem(id, 1);
                    closePlaylistItemContextMenu();
                }
                break;
            case "insert-above":
                button.onclick = () => {
                    addItem(idx);
                    closePlaylistItemContextMenu();
                }
                break;
            case "insert-below":
                button.onclick = () => {
                    addItem(idx + 1);
                    closePlaylistItemContextMenu();
                }
                break;
            case "delete":
                button.click = () => {
                    movePlaylistItem(id, 0);
                    closePlaylistItemContextMenu();
                }
        }
    }

    contextMenu.onblur = closePlaylistItemContextMenu;

    contextMenu.style.left = e.clientX;
    contextMenu.style.top = e.clientY;
    contextMenu.classList.remove("hidden");
}
function closePlaylistItemContextMenu() {
    let contextMenu = document.getElementById("playlist-item-context-menu");
    contextMenu.classList.add("hidden");
}
document.addEventListener("click", closePlaylistItemContextMenu);

function onPlaylistItemClick(e) {
    if (selectedItem)
        selectedItem.classList.remove("selected");
    if (curPlaylistItem.slides)
        document.getElementById(`slide-preview-i${curPlaylistItem.id}s${curSlideIdx}`)
            .classList.remove("selected");
    else if (curPlaylistItem.numSlides)
        document.getElementById(`slide-count-i${curPlaylistItem.id}`)
            .textContent = `${curPlaylistItem.numSlides} slides`;

    let id = parseInt(e.currentTarget.dataset.id);
    curPlaylistItem = playlist[id];
    curPlaylistItem.idx = parseInt(e.currentTarget.dataset.idx);

    let match = e.target.id.match(/^slide-preview-i\d+s(\d+)$/);
    if (match) {
        curSlideIdx = parseInt(match[1]);
    } else {
        curSlideIdx = 0;
    }
    curSlide = playlistItemToSlide( curPlaylistItem, curSlideIdx );

    e.currentTarget.classList.add("selected");
    if (curPlaylistItem.slides)
        document.getElementById(`slide-preview-i${id}s${curSlideIdx}`)
            .classList.add("selected");
    else if (curPlaylistItem.numSlides)
        document.getElementById(`slide-count-i${id}`)
            .textContent = `Slide 1 of ${curPlaylistItem.numSlides}`;
    selectedItem = e.currentTarget;

    refreshSlideShow()
}

function addPlaylistItemToDOM(id, idx = -1) {
    let div = playlistItemSample.cloneNode(true);

    div.classList.remove("hidden");
    div.id = "";
    div.dataset.id = id;
    div.dataset.idx = idx === -1 ? playlistElement.children.length : idx;

    div.addEventListener("click", onPlaylistItemClick);
    div.addEventListener("contextmenu", openPlaylistItemContextMenu);

    if (idx === -1) {
        playlistElement.appendChild(div);
    } else if (idx === 0) {
        playlistElement.insertAdjacentElement("afterBegin", div);
    } else {
        playlistElement.children[idx - 1].insertAdjacentElement("afterEnd", div);
    }

    return div;
}
function editPlaylistItemInDOM(item) {
    let idx = item.idx;
    let div = playlistElement.children[idx];

    div.children[0].innerHTML = item.template;
    div.children[1].innerHTML = item.preview;
    for (let e of Array.from(div.children)) {
        if (e.tagName === "P") {
            div.removeChild(e);
        }
    }
    if (item.slides) {
        for (let [s, slide] of Object.entries(item.slides)) {
            p = document.createElement("p");
            p.classList.add("slide-preview");
            p.id = `slide-preview-i${item.id}s${s}`;
            p.textContent = slide.replaceAll("\n", "");
            if (curPlaylistItem.id == item.id && curSlideIdx == s) {
                p.classList.add("selected");
            }
            div.appendChild(p);
        }
    } else if (item.numSlides) {
        p = document.createElement("p");
        p.classList.add("slide-count");
        p.id = `slide-count-i${item.id}`;
        if (curPlaylistItem.id == item.id)
            p.textContent = `Slide ${curSlideIdx+1} of ${item.numSlides}`;
        else
            p.textContent = `${item.numSlides} slides`;
        div.appendChild(p);
    }
}
function movePlaylistItem(id, offset) {
    let oldIndex = parseInt(playlist[id].idx);

    if (offset === 0) { // Delete item
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

    // Reevaluate the index of every playlist item
    for (let [idx, e] of Object.entries(Array.from(playlistElement.children))) {
        e.dataset.idx = idx;
        playlist[e.dataset.id].idx = idx;
        if (curPlaylistItem.id == e.dataset.id) {
            curPlaylistItem.idx = idx;
        }
    }
}

// ===
// Slide Controls
// ===
function nextItem() {
    if (curPlaylistItem.idx === playlist.length - 1)
        return;
    let nextPlaylistItem = playlistElement.children[curPlaylistItem.idx + 1]
    nextPlaylistItem.click();
}
function prevItem() {
    if (curPlaylistItem.idx === 0)
        return;
    let prevPlaylistItem = playlistElement.children[curPlaylistItem.idx - 1]
    prevPlaylistItem.click();
}

function blank() {
    if (slideshowWindow)
        slideshowWindow.postMessage({type: "blank"}, "*");
}

function unblank() {
    if (slideshowWindow)
        slideshowWindow.postMessage({type: "unblank"}, "*");
}

function prevSlide() {
    if (curSlideIdx <= 0)
        return;

    if (curPlaylistItem.slides) {
        document.getElementById(`slide-preview-i${curPlaylistItem.id}s${curSlideIdx}`)
            .classList.remove("selected");
        curSlide = playlistItemToSlide(curPlaylistItem, --curSlideIdx);
        document.getElementById(`slide-preview-i${curPlaylistItem.id}s${curSlideIdx}`)
            .classList.add("selected");
    } else if (curPlaylistItem.numSlides) {
        curSlide = playlistItemToSlide(curPlaylistItem, --curSlideIdx);
        document.getElementById(`slide-count-i${curPlaylistItem.id}`)
            .textContent = `Slide ${curSlideIdx+1} of ${curPlaylistItem.numSlides}`;
    } else {
        return;
    }

    refreshSlideShow();
}
function nextSlide() {
    if (curPlaylistItem.slides) {
        if (curSlideIdx >= curPlaylistItem.slides.length - 1)
            return;

        document.getElementById(`slide-preview-i${curPlaylistItem.id}s${curSlideIdx}`)
            .classList.remove("selected");
        curSlide = playlistItemToSlide(curPlaylistItem, ++curSlideIdx);
        document.getElementById(`slide-preview-i${curPlaylistItem.id}s${curSlideIdx}`)
            .classList.add("selected");
    } else if (curPlaylistItem.numSlides) {
        if (curSlideIdx >= curPlaylistItem.numSlides - 1)
            return;

        curSlide = playlistItemToSlide(curPlaylistItem, ++curSlideIdx);
        document.getElementById(`slide-count-i${curPlaylistItem.id}`)
            .textContent = `Slide ${curSlideIdx+1} of ${curPlaylistItem.numSlides}`;
    } else {
        return;
    }

    refreshSlideShow();
}
function jumpToSlide() {
    if (!curPlaylistItem.slides) return;

    let searchTerm = window.prompt("Enter a search term:");
    let resultIdx = curPlaylistItem.slides.findIndex(
        slide => slide.includes(searchTerm)
    );
    if (resultIdx === -1) return;

    document.getElementById(`slide-preview-i${curPlaylistItem.id}s${curSlideIdx}`)
        .classList.remove("selected");
    curSlideIdx = resultIdx
    curSlide = playlistItemToSlide(curPlaylistItem, curSlideIdx);
    document.getElementById(`slide-preview-i${curPlaylistItem.id}s${curSlideIdx}`)
        .classList.add("selected");
    refreshSlideShow()
}

function editItem(id = null) {
    if (id === null) {
        if (curPlaylistItem.id == -1) {
            alert("Select a slide first!");
            return;
        } else {
            id = curPlaylistItem.id;
        }
    }

    let url = "dialogs/edit-item.html";
    let dialog = window.open(url, "edit-item", "width=800,height=500");
    setTimeout(() => {
        dialog.postMessage(
            { type: "init", item: playlist[id] },
            "*"
        );
    }, 1000);
}
function addItem(idx = playlist.length) {
    let dialog = window.open("dialogs/edit-item.html", "edit-item", "width=800,height=500");
    setTimeout(() => {
        dialog.postMessage(
            { type: "init", item: {id: "new", idx, template: ""} },
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
    let playlistElement = document.getElementById("playlist-items");
    playlistElement.replaceChildren();
    playlist = {};
    nextItemId = 0;
}

async function openPlaylist(file) {
    closePlaylist();

    const push = item => {
        id = nextItemId++;
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
                let slides = ["<Title Slide>"]
                let slide = ""
                do {
                    slide += lines[++i] + "\n"
                    if ( lines[i].match(/(N|E)$/) ) {
                        slides.push(slide.slice(0, -2)) // Remove N|E and \n
                        slide = ""
                    }
                } while (!lines[i].endsWith("E"))
                push({
                    template: "bible",
                    title, location, slides,
                    preview: (title + " - " + location).replaceAll("<br>", "🆕"),
                })
                break;
            }
            case "2": {
                let [title, name] = args
                let slides = ["<Title Slide>"]
                let slide = ""
                do {
                    slide += lines[++i] + "\n"
                    if ( lines[i].match(/N|E$/) ) {
                        slides.push(slide.slice(0, -2)) // Remove N|E and \n
                        slide = ""
                    }
                } while (!lines[i].endsWith("E"))
                push({
                    template: "song",
                    title, name, slides,
                    preview: (title + " - " + name).replaceAll("<br>", "🆕"),
                })
                break;
            }
            case "3": {
                let [title, subtitle] = args
                let preview = subtitle ? title + " - " + subtitle : title;
                push({
                    template: "title",
                    title, subtitle, preview,
                })
                break;
            }
            case "4": {
                let [source] = args
                push({
                    template: "image",
                    source
                })
                break;
            }
            case "5": {
                let [videoId] = args
                push({
                    template: "youtube",
                    videoId, preview: videoId,
                })
                break;
            }
            case "6": {
                let [url] = args;
                push({
                    template: "pdf",
                    url, numSlides: Infinity, preview: url
                });
                break;
            }
        }
        i++;
    }

    for (let item of Object.values(playlist)) {
        addPlaylistItemToDOM(item.id, item.idx);
        editPlaylistItemInDOM(item);
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
        let item = playlist[element.dataset.id];
        switch (item.template) {
            case "welcome":
                textFile += `0,${item.year},${item.month},${item.day}\n`;
                break;
            case "bible":
                textFile += `1,${item.title},${item.location}\n`
                for (let [i,slide] of Object.entries(item.slides)) {
                    if (i == 0) continue;
                    textFile += `${slide}N\n`;
                }
                textFile = textFile.replace(/N\n$/, "E\n");
                break;
            case "song":
                textFile += `2,${item.title},${item.name}\n`
                for (let [i,slide] of Object.entries(item.slides)) {
                    if (i == 0) continue;
                    textFile += `${slide}N\n`;
                }
                textFile = textFile.replace(/N\n$/, "E\n");
                break;
            case "title":
                if (item.subtitle)
                    textFile += `3,${item.title},${item.subtitle}\n`;
                else
                    textFile += `3,${item.title}\n`;
                break;
            case "image":
                textFile += `4,${item.source}\n`;
                break;
            case "youtube":
                textFile += `5,${item.videoId}\n`;
                break;
            case "pdf":
                textFile += `6,${item.url}\n`;
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
    "ArrowRight": nextItem,
    "ArrowDown": nextItem,
    "ArrowLeft": prevItem,
    "ArrowUp": prevItem,
    "PageDown": nextSlide,
    "PageUp": prevSlide,
    "Cb": blank,
    "b": unblank,
    "Ce": editItem,
    "Ca": addItem,
    "j": jumpToSlide,
    "CSArrowUp": () => movePlaylistItem(curPlaylistItem.id, -1),
    "CSArrowDown": () => movePlaylistItem(curPlaylistItem.id, 1),
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


// ===
// Message Receiving
// ===
function handleEditItemMsg(data) {
    let {item} = data;
    let {id, idx} = item;

    if (id === "new") {
        id = nextItemId++;
        playlist[id] = {...item, id, idx};
        addPlaylistItemToDOM(id, idx);
    } else {
        item = {...playlist[id], ...item};
        playlist[id] = item;

        if (curPlaylistItem.id == id) {
            curPlaylistItem = item;
            curSlide = playlistItemToSlide(item, curSlideIdx);
            refreshSlideShow();
        }
    }

    editPlaylistItemInDOM(playlist[id]);
}

function handlePastePlaylist(e) {
    let {playlist} = e;
    let file = new File([playlist], "playlist.txt");
    openPlaylist(file);
}

window.addEventListener("message", e => {
    switch(e.data.type) {
        case "edit-item":
            handleEditItemMsg(e.data);
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
    playlistElement = document.getElementById("playlist-items");
    playlistItemSample = document.getElementById("playlist-item-sample");
    
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