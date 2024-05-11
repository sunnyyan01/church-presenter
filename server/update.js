import { readFile, writeFile } from 'node:fs/promises';
import { platform } from 'os';
import { execAsync, getAsync, waitForResp } from './common.js';

let curVersionCache = null;
async function getCurrentVersion() {
    if (curVersionCache)
        return curVersionCache;

    try {
        let resp = await execAsync(`git log --date=iso-strict --format="%ad%n%s" -1`);
        let [_, date, version, changes] = /([0-9-T+:]+)\n([0-9v.]+) - (.+)/s.exec(resp.stdout);
        curVersionCache = {source: "git", date, version, changes};
        return curVersionCache;
    } catch (e) {}

    try {
        let contents = await readFile("version.json");
        curVersionCache = JSON.parse(contents);
        return curVersionCache;
    } catch {
        curVersionCache = {};
        return curVersionCache;
    }
}

async function loadCache() {
    try {
        let contents = await readFile("latestVersion.json");
        return JSON.parse(contents);
    } catch {
        return {};
    }
}
function saveCache(cache) {
    writeFile("latestVersion.json", JSON.stringify(cache));
}

let cache = null;
async function getLatestVersion() {
    if (!cache) cache = await loadCache();

    let headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "church-presenter",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    if (cache.etag) {
        headers["If-None-Match"] = cache.etag;
    }
    let gh_res = await getAsync(
        "https://api.github.com/repos/sunnyyan01/church-presenter/commits/heads/master",
        { headers }
    );

    if (gh_res.statusCode == 200) {
        let etag = gh_res.headers.etag;

        let data = await waitForResp(gh_res);
        data = JSON.parse(data);
        let date = data.commit.author.date;
        let message = data.commit.message;
        let [version, changes] = message.split(" - ");

        cache = {date, version, changes, etag};
        saveCache(cache);
    } else if (gh_res.statusCode != 304) {
        throw new Error(`Github API error occurred: ${gh_res.statusCode}`);
    }

    return cache;
}

export async function checkUpdate(req, res) {
    let [curVersion, latestVersion] = await Promise.all(
        [getCurrentVersion(), getLatestVersion()]
    );
    res.send({curVersion, latestVersion});
}

export async function downloadUpdate(req, res) {
    let tmp = platform() == 'win32' ? "%tmp%\\" : "/tmp/";

    const versionTask = async () => {
        let latestVer = await getLatestVersion();
        let cmd = `echo "${JSON.stringify(latestVer)}" > "${tmp}church-presenter-update-temp.json"`;
        return await execAsync(cmd);
    }

    let cmd = `curl -L "https://github.com/sunnyyan01/church-presenter/archive/refs/heads/master.tar.gz" > "${tmp}church-presenter-update-temp.tar.gz"`;
    const downloadTask = () => execAsync(cmd);

    await Promise.all([versionTask(), downloadTask()]);
    res.status(204).send();
}