let TRANSLATIONS = {
    noSlideSelected: "Select a slide first!",
    jumpPrompt: "Enter a search term:",
};

function translateSubslideCount(curSubslide, numSubslides) {
    if (curSubslide == undefined) {
        return `${numSubslides} subslides`;
    } else {
        return `Subslide ${curSubslide} of ${numSubslides}`;
    }
}