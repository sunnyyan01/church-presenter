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
        updateMessage.textContent = "There is a minor problem with your install, you can update to fix this";
        updateButton.classList.remove("hidden");
    } else if (curVersion.version === latestVersion.version) {
        updateMessage.textContent = "The latest version is already installed";
    } else {
        updateMessage.textContent = "An update is available";
        updateButton.classList.remove("hidden");
    }

    updateTitle.textContent = latestVersion.version;

    let formattedDate = new Date(curVersion.date).toLocaleDateString(
        undefined, {day: "numeric", month: "short", "year": "numeric"}
    );
    updatePublishDate.textContent = `Published ${formattedDate}`

    updateDetail.textContent = latestVersion.changes;

    updateButton.addEventListener("click", async e => {
        e.target.disabled = true;
        updateProgress.textContent = "Downloading update. You may close this window."
        let resp = await fetch("/api/update/download");
        if (resp.ok) {
            updateProgress.textContent = "Download complete. The update will be installed next time Church Presenter starts. You may close this window."
        } else {
            updateProgress.textContent = `Download failed: ${await resp.text()}`;
            e.target.disabled = false;
        }
    })
}

window.addEventListener("load", () => {
    versionCheck();
})
