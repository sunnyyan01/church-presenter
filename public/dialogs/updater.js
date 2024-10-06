async function versionCheck() {
    let resp = await fetch("/api/update/check");
    if (!resp.ok)
        throw Error();
    let {curVersion, latestVersion} = await resp.json();

    let updateMessage = document.getElementById("update-message");
    let updateTitle = document.getElementById("update-title");
    let updatePublishDate = document.getElementById("update-publish-date");
    let updateDetail = document.getElementById("update-detail");
    let updateButton = document.getElementById("update-button");
    let updateProgress = document.getElementById("update-progress");

    if (!curVersion.version) {
        updateMessage.textContent = TRANSLATIONS.noVersionInfo;
        updateButton.classList.remove("hidden");
    } else if (curVersion.version === latestVersion.version) {
        updateMessage.textContent = TRANSLATIONS.noUpdateAvail;
    } else {
        updateMessage.textContent = TRANSLATIONS.updateAvail;
        updateButton.classList.remove("hidden");
    }

    updateTitle.textContent = latestVersion.version;

    let formattedDate = new Date(curVersion.date).toLocaleDateString(
        undefined, {day: "numeric", month: "short", "year": "numeric"}
    );
    updatePublishDate.textContent = TRANSLATIONS.publishDate.format(formattedDate);

    updateDetail.textContent = latestVersion.changes;

    updateButton.addEventListener("click", async e => {
        e.target.disabled = true;
        updateProgress.textContent = TRANSLATIONS.progressDownload;
        let resp = await fetch("/api/update/download");
        if (resp.ok) {
            updateProgress.textContent = TRANSLATIONS.progressComplete;
        } else {
            updateProgress.textContent = TRANSLATIONS.progressFailed.format(await resp.text());
            e.target.disabled = false;
        }
    })
}

window.addEventListener("load", () => {
    loadTranslations();
    versionCheck();
})
