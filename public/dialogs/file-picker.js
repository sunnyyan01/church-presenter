let fileList, submitBtn, warning;
let params, file;
let selectedFile;
let fileNameInput;

function onFileClick(e) {
    if (selectedFile)
        selectedFile.dataset.selected = false;
    selectedFile = e.currentTarget;
    selectedFile.dataset.selected = true;
    fileNameInput.value = selectedFile.textContent;
    submitBtn.dataset.disabled = false;
    if (params.action === "save") {
        warning.textContent = TRANSLATIONS.overwriteSaveWarn;
    }
}

function onFileNameChange(e) {
    let newName = e.currentTarget.value;
    if (selectedFile) {
        if (selectedFile.textContent === newName) return;
        selectedFile.dataset.selected = false;
        selectedFile = null;
    }
    for (let s of fileList.children) {
        if (s.textContent === newName) {
            s.dataset.selected = true;
            selectedFile = s;
            return;
        }
    }
    submitBtn.dataset.disabled = (
        params.action === "load" ? selectedFile === null : !newName
    );
    if (params.action === "save") {
        if (selectedFile === null)
            warning.textContent = "";
        else
            warning.textContent = TRANSLATIONS.overwriteSaveWarn;
    }
}

async function submit(e) {
    if (params.action === "load") {
        let resp = await fetch(`/api/files/${params.folder}/${fileNameInput.value}`);
        file = await resp.json();
        window.opener.postMessage(file);
        window.close();
    } else { // save
        let resp = await fetch(
            `/api/files/${params.folder}/${fileNameInput.value}`,
            {
                method: "PUT",
                body: JSON.stringify(file),
            }
        );
        if (resp.ok)
            window.close();
        else
            throw new Error(await resp.text());
    }
}

function onFileDblClick(e) {
    onFileClick(e);
    submit(e);
}

async function loadFileList() {
    let resp = await fetch(`/api/files/${params.folder}`);
    if (!resp.ok) return;
    let slides = await resp.json();
    fileList.replaceChildren(
        ...slides.map(slideName => {
            let e = document.createElement("div");
            e.className = "file";
            e.textContent = slideName;
            e.dataset.selected = false;
            e.addEventListener("click", onFileClick);
            e.addEventListener("dblclick", onFileDblClick);
            return e;
        })
    )
}

window.addEventListener("load", async () => {
    params = Object.fromEntries(new URLSearchParams(window.location.search));

    warning = document.getElementById("warning");
    fileList = document.getElementById("file-list");
    submitBtn = document.getElementById("submit-btn");
    fileNameInput = document.getElementById("file-name-input");
    fileNameInput.onchange = onFileNameChange;
    loadFileList();
    
    await loadTranslations();

    fileList.dataset.action = params.action;
    submitBtn.textContent = TRANSLATIONS["actionLabel_" + params.action];

    if (params.overwriteWarn === "true")
        warning.textContent = TRANSLATIONS.overwriteOpenWarn;

    let folderName = TRANSLATIONS["folderName_" + params.folder];
    document.getElementsByTagName("h1")[0].textContent = folderName;
    document.title = `Church Presenter | ${folderName}`;
})

window.addEventListener("message", e => {
    file = e.data;
})