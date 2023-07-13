let curSlide = {
    "template": "blank"
};
let curPlaylistItem = curSlide;
let curPlaylistIdx = -1;
let curSlideIdx = 0;
let selectedItem = null;
let playlist = [];

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
            return {
                template: "bible",
                fields: { title, location, text: slides[slideIdx] },
            }
        }
        case "song": {
            let {title, name, slides} = item
            return {
                template: "song",
                fields: { title, name, lyrics: slides[slideIdx] },
            }
        }
        case "title": {
            let {title} = item
            return {
                template: "title",
                fields: { title },
            }
        }
        case "subtitle": {
            let {title, subtitle} = item
            return {
                template: "subtitle",
                fields: { title, subtitle },
            }
        }
        case "image": {
            let {source} = item
            return {
                template: "image",
                elements: [{
                    tag_name: "img",
                    attributes: {
                        src: source,
                    }
                }]
            }
        }
    }
}

function onPlaylistItemClick(clickedItem) {
    if (clickedItem.dataset.index == curPlaylistIdx)
        return;

    if (selectedItem)
        selectedItem.classList.remove("selected");
    if (curPlaylistItem.slides)
        document.getElementById(`slide-preview-i${curPlaylistIdx}s${curSlideIdx}`)
            .classList.remove("selected");

    curPlaylistIdx = parseInt(clickedItem.dataset.index);
    curPlaylistItem = playlist[curPlaylistIdx]
    curSlideIdx = 0
    curSlide = playlistItemToSlide( curPlaylistItem, curSlideIdx );

    clickedItem.classList.add("selected");
    if (curPlaylistItem.slides)
        document.getElementById(`slide-preview-i${curPlaylistIdx}s${curSlideIdx}`)
            .classList.add("selected");
    selectedItem = clickedItem;

    refreshSlideShow()
}

// ===
// Slide Controls
// ===
function nextItem() {
    if (curPlaylistIdx === playlist.length - 1)
        return;
    let playlistElement = document.getElementById("playlist-items");
    let nextPlaylistItem = playlistElement.children[curPlaylistIdx + 1]
    onPlaylistItemClick(nextPlaylistItem);
}
function prevItem() {
    if (curPlaylistIdx === 0)
        return;
    let playlistElement = document.getElementById("playlist-items");
    let nextPlaylistItem = playlistElement.children[curPlaylistIdx - 1]
    onPlaylistItemClick(nextPlaylistItem);
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
    if (curSlideIdx === 0)
        return;
    document.getElementById(`slide-preview-i${curPlaylistIdx}s${curSlideIdx}`)
        .classList.remove("selected");
    curSlide = playlistItemToSlide(
        playlist[curPlaylistIdx],
        --curSlideIdx,
    )
    document.getElementById(`slide-preview-i${curPlaylistIdx}s${curSlideIdx}`)
        .classList.add("selected");
    refreshSlideShow()
}
function nextSlide() {
    if (curSlideIdx === curPlaylistItem.slides.length - 1)
        return;
    document.getElementById(`slide-preview-i${curPlaylistIdx}s${curSlideIdx}`)
        .classList.remove("selected");
    curSlide = playlistItemToSlide(
        playlist[curPlaylistIdx],
        ++curSlideIdx,
    )
    document.getElementById(`slide-preview-i${curPlaylistIdx}s${curSlideIdx}`)
        .classList.add("selected");
    refreshSlideShow()
}
function jumpToSlide() {
    if (!curPlaylistItem.slides) return;

    let searchTerm = window.prompt("Enter a search term:");
    let resultIdx = curPlaylistItem.slides.findIndex(
        slide => slide.includes(searchTerm)
    );
    if (resultIdx === -1) return;

    document.getElementById(`slide-preview-i${curPlaylistIdx}s${curSlideIdx}`)
        .classList.remove("selected");
    curSlideIdx = resultIdx
    curSlide = playlistItemToSlide(
        playlist[curPlaylistIdx],
        curSlideIdx
    )
    document.getElementById(`slide-preview-i${curPlaylistIdx}s${curSlideIdx}`)
        .classList.add("selected");
    refreshSlideShow()
}

function editCurItem(advanced = false) {
    if (curPlaylistIdx === -1) {
        alert("Select a slide first!");
        return;
    }

    let url = advanced ? "dialogs/edit-item-advanced.html" : "dialogs/edit-item.html";
    let dialog = window.open(url, "edit-item", "width=800,height=500");
    setTimeout(() => {
        dialog.postMessage(
            { type: "init", idx: curPlaylistIdx, item: curPlaylistItem },
            "*"
        );
    }, 1000);
}
function addItem() {
    if (curPlaylistIdx === -1) {
        alert("Select a slide first!");
        return;
    }

    let dialog = window.open("dialogs/edit-item.html", "edit-item", "width=800,height=500");
    setTimeout(() => {
        dialog.postMessage(
            { type: "init", idx: playlist.length, item: {template: ""} },
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
    playlist = [];
}

async function openPlaylist(file) {
    closePlaylist();

    let text = await file.text();
    let newline = text.includes("\r") ? "\r\n" : "\n";
    let lines = text.split(newline);
    let i = 0
    while (i < lines.length) {
        let [template, ...args] = lines[i].split(",")
        switch (template) {
            case "0": {
                let [year, month, day] = args
                playlist.push({
                    template: "welcome",
                    year, month, day,
                    preview: args.join("/"),
                })
                break;
            }
            case "1": {
                let [title, location] = args
                let slides = []
                let slide = ""
                do {
                    slide += lines[++i] + "\n"
                    if ( lines[i].match(/(N|E)$/) ) {
                        slides.push(slide.slice(0, -2)) // Remove N|E and \n
                        slide = ""
                    }
                } while (!lines[i].endsWith("E"))
                playlist.push({
                    template: "bible",
                    title, location, slides,
                    preview: (title + " - " + location).replaceAll("<br>", "🆕"),
                })
                break;
            }
            case "2": {
                let [title, name] = args
                let slides = []
                let slide = ""
                do {
                    slide += lines[++i] + "\n"
                    if ( lines[i].match(/N|E$/) ) {
                        slides.push(slide.slice(0, -2)) // Remove N|E and \n
                        slide = ""
                    }
                } while (!lines[i].endsWith("E"))
                playlist.push({
                    template: "song",
                    title, name, slides,
                    preview: (title + " - " + name).replaceAll("<br>", "🆕"),
                })
                break;
            }
            case "3": {
                let [title] = args
                playlist.push({
                    template: "title",
                    title,
                    preview: title
                })
                break;
            }
            case "4": {
                let [title, subtitle] = args
                playlist.push({
                    template: "subtitle",
                    title, subtitle,
                    preview: title + " - " + subtitle,
                })
                break;
            }
            case "5": {
                let [source] = args
                playlist.push({
                    template: "image",
                    source
                })
                break;
            }
        }
        i++;
    }

    let playlistElement = document.getElementById("playlist-items");
    let playlistItemSample = document.getElementById("playlist-item-sample");
    for (let [i, item] of Object.entries(playlist)) {
        let div = playlistItemSample.cloneNode(true);

        div.children[0].innerHTML = item.template;
        div.children[1].innerHTML = item.preview;
        if (item.slides) {
            for (let [s, slide] of Object.entries(item.slides)) {
                let p = document.createElement("p");
                p.innerHTML = slide.replaceAll("\n", "");
                p.id = `slide-preview-i${i}s${s}`;
                div.appendChild(p);
            }
        }

        div.dataset.index = i;
        div.classList.remove("hidden")
        div.id = "";
        playlistElement.appendChild(div);
    }

    document.getElementById("save-playlist-btn").disabled = false;
    document.getElementById("playlist-name").innerText = `Current playlist: ${file.name}`;
}

function pastePlaylist() {
    window.open("dialogs/paste-playlist.html", "paste-playlist", "width=800,height=700");
}

function savePlaylist() {
    let textFile = "";
    for (let item of playlist) {
        switch (item.template) {
            case "welcome":
                textFile += `0,${item.year},${item.month},${item.day}\n`;
                break;
            case "bible":
                textFile += `1,${item.title},${item.location}\n`
                for (let slide of item.slides) {
                    textFile += `${slide}N\n`;
                }
                textFile = textFile.replace(/N\n$/, "E\n");
                break;
            case "song":
                textFile += `2,${item.title},${item.name}\n`
                for (let slide of item.slides) {
                    textFile += `${slide}N\n`;
                }
                textFile = textFile.replace(/N\n$/, "E\n");
                break;
            case "title":
                textFile += `3,${item.title}\n`;
                break;
            case "subtitle":
                textFile += `4,${item.title},${item.subtitle}\n`;
                break;
            case "image":
                textFile += `5,${item.source}\n`;
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
// Timer Controls
// ===
let timer, timerElement, timerStart;
function toggleTimer() {
    if (timer) {
        clearInterval(timer);
    } else {
        if (!timerStart) {
            timerStart = Date.now();
        }
        timerElement = document.getElementById("timer");
        timer = setInterval(() => {
            let elapsed = (Date.now() - timerStart) / 1000;
            let minutes = (elapsed / 60).toFixed(0);
            let seconds = (elapsed % 60).toFixed(0);
            timerElement.innerText = `${minutes}m ${seconds}s`
        }, 1000);
    }
}

function resetTimer() {
    timerStart = 0;
    clearInterval(timer);
    timer = null;
    timerElement.innerText = ""
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
    "SB": blank,
    "b": unblank,
    "SE": () => editCurItem(false),
    "SD": () => editCurItem(true),
    "SA": addItem,
    "j": jumpToSlide,
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
function handleItemEditorClose(data) {
    let {idx, item} = data;

    if (curPlaylistIdx == idx) {
        curPlaylistItem = item;
        curSlide = playlistItemToSlide(item, curSlideIdx);
        refreshSlideShow();
    }
    
    playlist[idx] = item;
    
    let playlistItems = document.getElementById("playlist-items");
    let div = playlistItems.children[idx];
    if (!div) {
        // New item - clone the previous div
        div = playlistItems.lastChild.cloneNode(true);
        div.dataset.index++;
        playlistItems.appendChild(div);
    }
    div.children[0].innerHTML = item.template;
    div.children[1].innerHTML = item.preview;
    if (item.slides) {
        for (let e of Array.from(div.children)) {
            if (e.tagName === "P") {
                div.removeChild(e);
            }
        }
        for (let [s, slide] of Object.entries(item.slides)) {
            p = document.createElement("p");
            p.id = `slide-preview-i${idx}s${s}`;
            p.innerHTML = slide.replaceAll("\n", "");
            if (curPlaylistIdx == idx && curSlideIdx == s) {
                p.classList.add("selected");
            }
            div.appendChild(p);
        }
    }
}

function handlePastePlaylist(e) {
    let {playlist} = e;
    let file = new File([playlist], "playlist.txt");
    openPlaylist(file);
}

window.addEventListener("message", e => {
    switch(e.data.type) {
        case "item-editor-close":
            handleItemEditorClose(e.data);
            break;
        case "paste-playlist":
            handlePastePlaylist(e.data);
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
                console.log(`Error setting ${id}`);
            }
        }
    }
}

window.addEventListener("load", e => refreshTranslations());