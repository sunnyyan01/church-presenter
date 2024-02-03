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

    if (curVersion.version === latestVersion.version) {
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
}

window.addEventListener("load", () => {
    versionCheck();
})
