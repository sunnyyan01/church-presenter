window.curTemplate = ""
let ytPlayer;
let ytPlayingInterval;

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

    if (slide.template === "youtube") {
        let videoId = document.getElementById("youtube-player-element").dataset.videoId;
        if (ytPlayer) {
            ytPlayer.cueVideoById(videoId);
        } else {
            ytPlayer = new YT.Player("youtube-player-element", {
                height: window.innerHeight.toString(),
                width: window.innerWidth.toString(),
                videoId,
                playerVars: { controls: 0 },
                events: { 'onStateChange': onPlayerStateChange },
            });
        }
    }

    selTemplate.classList.add("showing");
    window.curTemplate = slide.template;
}

function onBlank() {
    let curTemplate = document.getElementById(window.curTemplate + "-template");
    curTemplate.classList.remove("showing");
}

function onUnblank() {
    let curTemplate = document.getElementById(window.curTemplate + "-template");
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

function togglePlayback() {
    if (ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
        ytPlayer.pauseVideo();
    } else {
        ytPlayer.playVideo();
    }
}
const timeConvert = sec => (
    (sec / 60).toFixed(0) +
    ":" +
    (sec % 60).toFixed(0).padStart(2, "0")
);
function onPlayerStateChange({data}) {
    if (data === YT.PlayerState.PLAYING) {
        ytPlayingInterval = setInterval(() => {
            let cur = timeConvert( ytPlayer.getCurrentTime() );
            let len = timeConvert( ytPlayer.getDuration() );
            window.opener.postMessage(
                {type: "set-timer", text: `${cur} / ${len}`}, "*"
            );
        }, 1000)
    } else if (ytPlayingInterval) {
        clearInterval(ytPlayingInterval);
    }
}

window.addEventListener("message", e => {
    switch(e.data.type) {
        case "change-slide":
            return onChangeSlide(e.data)
        case "blank":
            return onBlank()
        case "unblank":
            return onUnblank()
        case "scroll":
            return onScroll(e.data)
        case "fullscreen":
            return onFullscreen()
        case "hide":
            return onHide()
        case "show":
            return onShow()
        case "togglePlayback":
            return togglePlayback()
        case "stopPlayback":
            return ytPlayer.stopVideo()
    }
})