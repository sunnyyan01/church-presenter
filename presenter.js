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
            let {datetime} = item
            return {
                template: "welcome",
                fields: { datetime },
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

async function loadPlaylist(file) {
    let text = await file.text();
    let lines = text.split("\r\n");
    let i = 0
    while (i < lines.length) {
        let [template, ...args] = lines[i].split(",")
        switch (template) {
            case "0": {
                let [year, month, day] = args
                playlist.push({
                    template: "welcome",
                    datetime: `${year}年${month}月${day}日上午10時`,
                    preview: args,
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
                    preview: title + " - " + location,
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
                    preview: title + " - " + name,
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
        div.id = undefined;
        playlistElement.appendChild(div);
    }
}

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

const KEY_MAP = {
    "ArrowRight": nextItem,
    "ArrowDown": nextItem,
    "ArrowLeft": prevItem,
    "ArrowUp": prevItem,
    "PageDown": nextSlide,
    "PageUp": prevSlide,
    "B": blank,
    "b": unblank,
    "j": jumpToSlide,
}
window.addEventListener("keydown", e => {
    let handler = KEY_MAP[e.key];
    if (handler) {
        handler();
        e.preventDefault();
    }
})
