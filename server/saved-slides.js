import { readdir, readFile, mkdir, rm, writeFile } from 'node:fs/promises';

export async function getSavedSlides(req, res) {
    try {
        let slides = await readdir("saved-slides");
        res.send(slides);
    } catch {
        mkdir("saved-slides");
        res.send([]);
    }
}

export async function getSavedSlide(req, res) {
    let {name} = req.params;
    if (name.match(/(^\.+$)|(\/)/)) {
        res.status(400).send();
        return;
    }
    try {
        let contents = await readFile(`saved-slides/${name}`, "utf8");
        res.send(JSON.parse(contents));
    } catch (err) {
        res.status(500).send(err.message);
    }
}

export async function putSavedSlide(req, res) {
    let {name} = req.params;
    if (name.match(/(^\.+$)|(\/)/)) {
        res.status(400).send();
        return;
    }
    try {
        await writeFile(`saved-slides/${name}`, req.body.toString());
        res.status(204).send();
    } catch (err) {
        res.status(500).send(err.message);
    }
}

export async function deleteSavedSlide(req, res) {
    let {name} = req.params;
    if (name.match(/(^\.+$)|(\/)/)) {
        res.status(400).send();
        return;
    }
    try {
        await rm(`saved-slides/${name}`);
        res.status(204).send();
    } catch (err) {
        res.status(500).send(err.message);
    }
}