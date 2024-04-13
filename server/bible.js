import { JSDOM } from "jsdom";
import { getAsync, waitForResp } from "./common.js";

async function bibleGatewayLookup(loc, version) {
    let res = await getAsync(`https://www.biblegateway.com/passage/?search=${loc}&version=${version}&interface=print`)
        .catch(console.error);
    if (res.statusCode !== 200) {
        throw Error(`Error ${res.statusCode} from Bible Gateway`);
    }
    let data = await waitForResp(res);
    let dom = new JSDOM(data);
    let div = dom.window.document.querySelector("div.passage-content");
    if (!div) {
        throw Error("Couldn't find requested passage");
    }
    let text = "";
    for (let span of div.getElementsByTagName("span")) {
        if (span.classList.contains("text"))
            text += span.textContent + "\n";
    }
    return text;
}

function mergeVersions(versionA, versionB) {
    versionA = versionA.split("\n");
    versionB = versionB.split("\n");
    let result = [];
    while (versionA.length && versionB.length) {
        if (versionA[0] < versionB[0])
            result.push(versionA.shift());
        else
            result.push(versionB.shift());
    }
    result.push(...(versionA.length ? versionA : versionB));
    return result.join("\n");
}

export async function bibleLookup(req, res) {
    // let [book, loc] = location.match(/(.+?)([0-9:-]+)/)
    // book = normaliseBook(book)

    let {loc} = req.query;
    let versionStr = req.query.version || "CUVMPS";
    let versions = versionStr.split(",");

    let results = await Promise.all(
        versions.map(version => bibleGatewayLookup(loc, version))
    );

    let result = (
        versions.length === 2
        ? mergeVersions(...results)
        : results.join("\n")
    );
    
    res.type("text/plain");
    res.send(result);
}