let TRANSLATIONS = {};

async function loadTranslations() {
    let { lang } = JSON.parse(localStorage.getItem("settings") || "{}");
    if (!lang) lang = "en";

    let pagePath = window.location.pathname;
    let [_, pageFolder, pageName] = pagePath.match(/(.*\/)(.+)\..+?/)
    let txtPath = `translations/${pageName}.${lang}.txt`;

    let resp = await fetch(txtPath);
    let translations = await resp.text();
    let reader = new TextReader(translations);

    const TEXT_NODE_TYPES = ["H1", "H2", "H3", "H4", "H5", "H6", "P"]
    while (reader.read() !== "===") {
        let [_, selector, string] = reader.lastRead.match(/(.+?),(.+)/);
        try {
            let e = document.querySelector(selector);
            if (
                TEXT_NODE_TYPES.includes(e.nodeName) ||
                e.textContent.trim()
            )
                e.textContent = string;
            else
                e.title = string;
        } catch {
            console.error(`Error setting ${selector}`);
        }
    }

    while (reader.canRead) {
        let [_, key, val] = reader.read().match(/(.+?),(.+)/);
        if (val.includes("{}"))
            TRANSLATIONS[key] = new FormatString(val);
        else
            TRANSLATIONS[key] = val;
    }

    if (TRANSLATIONS.pageTitle)
        document.title = `Church Presenter | ${TRANSLATIONS.pageTitle}`;
}