let TRANSLATIONS = {
    noSlideSelected: "请先选一个影片",
    jumpPrompt: "输入搜索词:",
};

function translateSubslideCount(curSubslide, numSubslides) {
    if (curSubslide == undefined) {
        return `共${numSubslides}页`;
    } else {
        return `第${curSubslide}页 共${numSubslides}页`;
    }
}