async function startCapture() {
    let captureStream = await navigator.mediaDevices.getDisplayMedia();
    let video = document.getElementById("preview");
    video.srcObject = captureStream;
    video.play();
    document.getElementById("button").hidden = true;
}