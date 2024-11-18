import { readdir, readFile, mkdir, rm, writeFile } from 'node:fs/promises';

const VALID_FOLDERS = [
    "saved-slides",
]
function checkParams(folder, name) {
    // Returns true when folder or file name is not allowed
    return (
        !VALID_FOLDERS.includes(folder) ||
        (name && name.match(/(^\.+$)|(\/)/))
    )
}

export async function listFiles(req, res) {
    let {folder} = req.params;

    if (checkParams(folder)) {
        res.status(400).send();
        return;
    }

    try {
        let slides = await readdir(folder);
        res.send(slides);
    } catch {
        mkdir(folder);
        res.send([]);
    }
}

export async function getFile(req, res) {
    let {folder, name} = req.params;
    if (checkParams(folder, name)) {
        res.status(400).send();
        return;
    }
    try {
        let contents = await readFile(`${folder}/${name}`, "utf8");
        res.send(JSON.parse(contents));
    } catch (err) {
        res.status(500).send(err.message);
    }
}

export async function putFile(req, res) {
    let {folder, name} = req.params;
    if (checkParams(folder, name)) {
        res.status(400).send();
        return;
    }
    try {
        await writeFile(`${folder}/${name}`, req.body.toString());
        res.status(204).send();
    } catch (err) {
        res.status(500).send(err.message);
    }
}

export async function deleteFile(req, res) {
    let {folder, name} = req.params;
    if (checkParams(folder, name)) {
        res.status(400).send();
        return;
    }
    try {
        await rm(`${folder}/${name}`);
        res.status(204).send();
    } catch (err) {
        res.status(500).send(err.message);
    }
}