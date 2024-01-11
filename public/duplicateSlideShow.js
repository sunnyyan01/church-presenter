async function startCapture() {
    let captureStream = await navigator.mediaDevices.getDisplayMedia();
    let video = document.getElementById("preview-frame");
    video.srcObject = captureStream;
    video.play();
    document.getElementById("setup-preview-btn").hidden = true;
}