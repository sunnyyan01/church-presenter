window.curTemplate = ""
let ytPlayer, ytPlayingInterval;
let ytPlayerReady = false;
let pdfCur = {url: "", pageNum: -1, renderTask: null, renderComplete: true};
let pdfObj;

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.js';

function youtubeSlideHandler() {
    if (ytPlayerReady)
        cueVideoFromDataset();
}
async function pdfSlideHandler() {
    let canvas = document.getElementById("pdf-canvas-element");
    let ctx = canvas.getContext("2d");
    let {url, pageNum, slideId} = canvas.dataset;
    pageNum = parseInt(pageNum);

    if (pdfCur.url !== url) {
        pdfObj = await pdfjsLib.getDocument(url).promise;
        pdfCur.url = url;
        let numPages = pdfObj.numPages;
        window.opener.postMessage({
            type: "edit-slide",
            slide: {id: slideId, numSubslides: numPages}
        })
    }

    if (pdfCur.pageNum !== pageNum) {
        let page = await pdfObj.getPage(pageNum);
        let viewport = page.getViewport({scale: 2});

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (!pdfCur.renderComplete) {
            pdfCur.renderTask.cancel();
            pdfCur.pageNum = -1;
            try {
                await pdfCur.renderTask.promise;
            } catch {}
        }

        pdfCur.renderComplete = false;

        pdfCur.renderTask = page.render({canvasContext: ctx, viewport});
        pdfCur.renderTask.promise.then(() => {
            pdfCur.renderComplete = true;
        })
    }
}

function onChangeSlide({slide}) {
    if (window.curTemplate) {
        let oldTemplate = document.getElementById(window.curTemplate + "-template");
        oldTemplate.classList.remove("showing");
    }

    if (slide.template === "blank") return;
    let selTemplate = document.getElementById(slide.template + "-template");
    
    for (let field in slide.fields || {}) {
        let text = slide.fields[field];
        if (slide.template === "bible" && field === "text") {
            text = text.replaceAll(/^([0-9]+)/gm, "<sup>$1</sup>");
        }
        let element = document.getElementById(`${slide.template}-${field}-field`);
        if (element)
            element.innerHTML = text;
    }

    for (let element of slide.elements || []) {
        let htmlEl = document.getElementById(`${slide.template}-${element.id}-element`);
        for (let name in element.attributes) {
            htmlEl.setAttribute(name, element.attributes[name]);
        }
        for (let key in element.dataset) {
            htmlEl.dataset[key] = element.dataset[key];
        }
    }

    if (slide.template === "youtube")
        youtubeSlideHandler();
    else if (slide.template === "pdf")
        pdfSlideHandler();

    selTemplate.classList.add("showing");
    window.curTemplate = slide.template;
}

function onToggleBlank() {
    let curTemplate = document.getElementById(window.curTemplate + "-template");
    if (curTemplate.classList.contains("showing"))
        curTemplate.classList.remove("showing");
    else
        curTemplate.classList.add("showing");
}

function onScroll({ direction }) {
    let curTemplate = document.getElementById(window.curTemplate + "-template");
    let scrollable = curTemplate.getElementsByClassName("scrollable")[0]
    scrollable.scrollBy(0, direction * ( scrollable.offsetHeight - 100 ));
}

function onFullscreen() {
    document.documentElement.requestFullscreen({navigationUI: "hide"});
}
function onHide() {
    window.blur();
}
function onShow() {
    window.focus();
}

function togglePlayback({videoId, start, end}) {
    if (!ytPlayer.getVideoUrl().includes(videoId)) {
        let startSeconds = start ? parseFloat(start) : undefined;
        let endSeconds = end ? parseFloat(end) : undefined;

        ytPlayer.loadVideoById({videoId, startSeconds, endSeconds})
    }

    if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
    } else {
        ytPlayer.playVideo();
    }
}
function cueVideoFromDataset() {
    let {videoId, start, end} = document.getElementById("youtube-player-element").dataset;
    if (!videoId)
        return;
    let startSeconds = start ? parseFloat(start) : undefined;
    let endSeconds = end ? parseFloat(end) : undefined;

    if (!ytPlayer.getVideoUrl().includes(videoId))
        ytPlayer.cueVideoById({videoId, startSeconds, endSeconds});
}
const timeConvert = sec => (
    Math.trunc(sec / 60) +
    ":" +
    (sec % 60).toFixed(0).padStart(2, "0")
);
function onPlayerStateChange({data}) {
    if (data === YT.PlayerState.PLAYING) {
        ytPlayingInterval = setInterval(() => {
            let cur = timeConvert( ytPlayer.getCurrentTime() );
            let len = timeConvert( ytPlayer.getDuration() );
            window.opener.postMessage(
                {type: "set-time-display", text: `${cur} / ${len}`}, "*"
            );
        }, 1000)
    } else if (ytPlayingInterval) {
        clearInterval(ytPlayingInterval);
    }
}

window.addEventListener("load", () => {
    ytPlayer = new YT.Player("youtube-player-element", {
        height: window.innerHeight.toString(),
        width: window.innerWidth.toString(),
        events: {
            'onReady': () => {
                ytPlayerReady = true;
                cueVideoFromDataset();
            },
            'onStateChange': onPlayerStateChange
        },
    });
})

window.addEventListener("message", e => {
    switch(e.data.type) {
        case "change-slide":
            return onChangeSlide(e.data)
        case "blank":
            return onToggleBlank()
        case "scroll":
            return onScroll(e.data)
        case "fullscreen":
            return onFullscreen()
        case "hide":
            return onHide()
        case "show":
            return onShow()
        case "togglePlayback":
            return togglePlayback(e.data)
        case "stopPlayback":
            return ytPlayer.stopVideo()
    }
})