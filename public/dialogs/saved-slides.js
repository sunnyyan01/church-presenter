let slideList, submitBtn, warning;
let action, slide;
let selectedSlide;
let slideNameInput;

function onSlideClick(e) {
    if (selectedSlide)
        selectedSlide.dataset.selected = false;
    selectedSlide = e.currentTarget;
    selectedSlide.dataset.selected = true;
    slideNameInput.value = selectedSlide.textContent;
    submitBtn.dataset.disabled = false;
    if (action === "save") {
        warning.textContent = "Saving under this name will overwrite a previously saved slide"
    }
}

function onSlideNameChange(e) {
    let newName = e.currentTarget.value;
    if (selectedSlide) {
        if (selectedSlide.textContent === newName) return;
        selectedSlide.dataset.selected = false;
        selectedSlide = null;
    }
    for (let s of slideList.children) {
        if (s.textContent === newName) {
            s.dataset.selected = true;
            selectedSlide = s;
            return;
        }
    }
    submitBtn.dataset.disabled = (
        action === "load" ? selectedSlide === null : !newName
    );
    if (action === "save") {
        if (selectedSlide === null)
            warning.textContent = "";
        else
            warning.textContent = "Saving under this name will overwrite a previously saved slide";
    }
}

async function submit(e) {
    if (action === "load") {
        let resp = await fetch(`/api/saved-slide/${slideNameInput.value}`);
        let slide = await resp.json();
        window.opener.postMessage(slide);
        window.close();
    } else { // save
        let resp = await fetch(
            `/api/saved-slide/${slideNameInput.value}`,
            {
                method: "PUT",
                body: JSON.stringify(slide),
            }
        );
        if (resp.ok)
            window.close();
        else
            throw new Error(await resp.text());
    }
}

function onSlideDblClick(e) {
    onSlideClick(e);
    submit(e);
}

async function loadSlideList() {
    let resp = await fetch("/api/saved-slides");
    if (!resp.ok) return;
    let slides = await resp.json();
    slideList.replaceChildren(
        ...slides.map(slideName => {
            let e = document.createElement("div");
            e.className = "saved-slide";
            e.textContent = slideName;
            e.dataset.selected = false;
            e.addEventListener("click", onSlideClick);
            e.addEventListener("dblclick", onSlideDblClick);
            return e;
        })
    )
}

window.addEventListener("load", () => {
    warning = document.getElementById("warning");
    slideList = document.getElementById("saved-slides-list");
    submitBtn = document.getElementById("submit-btn");
    slideNameInput = document.getElementById("slide-name-input");
    slideNameInput.onchange = onSlideNameChange;
    loadSlideList();
})

window.addEventListener("message", e => {
    ({action, slide} = e.data);
    slideList.dataset.action = action;
    submitBtn.textContent = action === "load" ? "Open" : "Save";
    if (e.data.overwriteWarn)
        warning.textContent = "If you load a slide, any data currently in this slide will be overwritten";
})