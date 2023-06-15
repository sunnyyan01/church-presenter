window.curTemplate = ""

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
            text = text.replaceAll(/([0-9]+)/g, "<sup>$1</sup>");
        }
        let element = document.getElementById(`${slide.template}-${field}-field`);
        if (element)
            element.innerHTML = text;
    }

    for (let element of slide.elements || []) {
        let htmlEl = selTemplate.getElementsByTagName(element.tag_name)[0];
        for (let name in element.attributes) {
            htmlEl.setAttribute(name, element.attributes[name]);
        }
    }

    // if (slide.template === "youtube") {
    //     let videoId = document.getElementById("youtube-player").dataset.youtubeId
    //     window.ytPlayer = new YT.Player("youtube-player", {
    //         height: window.innerHeight.toString(),
    //         width: window.innerWidth.toString(),
    //         videoId,
    //         playerVars: { controls: 0, origin: "null" },
    //     });
    // }

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
    }
})