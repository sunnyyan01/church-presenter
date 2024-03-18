class Playlist {
    slides = {};
    #nextSlideId = 0;

    getSlide(id) {
        return this.slides[id];
    }
    setSlide(slide) {
        if (slide.id == -1) {
            slide.id == this.#nextSlideId++;
        }
        if (slide.idx == -1) {
            slide.idx = slides.length;
        } else if (slide.idx >= this.#nextSlideId) {
            this.#nextSlideId = slide.idx + 1;
        }
        this.slides[slide.id] = slide;
        return this.slides[slide.id];
    }
    updateSlide(id, update) {
        for (let [key, val] of Object.entries(update)) {
            this.slides[id][key] = val;
        }
        return this.slides[id];
    }
    deleteSlide(id) {
        delete this.slides[id];
    }

    static fromTxt(text) {
        let reader = TxtReader(text);
        let playlist = new Playlist();
        while (reader.canRead()) {
            playlist.setSlide(Slide.fromTxt(reader));
        }
        return playlist;
    }
    static fromJson(text) {
        let playlistObj = JSON.parse(text);
        let playlist = new Playlist();
        for (let slide of playlistObj) {
            playlist.setSlide(Slide.fromJson(slide));
        }
        return playlist;
    }

    [Symbol.iterator]() {
        return Object.values(this.slides).values();
    }

    get length() {
        return this.slides.length;
    }

    toJson() {
        return JSON.stringify(Object.values(this.slides));
    }
}

class TxtReader {
    #lines;
    #index;

    constructor(text) {
        let newline = text.includes("\r") ? "\r\n" : "\n";
        this.#lines = text.trim().split(newline);
        this.#index = 0;
    }

    canRead() {
        return this.#index < this.#lines.length;
    }

    peek() {
        return this.#lines[this.#index];
    }

    read() {
        return this.#lines[this.#index++];
    }
}

class Slide {
    static templateName = "";
    static positionalArgs = null;
    static subslideType = "none";
    static hasPlaybackControls = false;
    id = -1;
    idx = -1;
    #previewOverride = "";

    constructor({id, idx, preview}) {
        this.id = id != undefined ? parseInt(id) : -1;
        this.idx = idx != undefined ? parseInt(idx) : -1;
        this.#previewOverride = preview;
    }

    get templateName() {
        return this.constructor.templateName;
    }
    get positionalArgs() {
        return this.constructor.positionalArgs;
    }
    get subslideType() {
        return this.constructor.subslideType;
    }
    get hasPlaybackControls() {
        return this.constructor.hasPlaybackControls;
    }

    static nameArgs(args, positionalArgs) {
        let positionalsMatched = 0;
        let namedArgs = {};
        for (let arg of line) {
            if (arg.includes("=")) {
                let [key, val] = arg.split("=");
                namedArgs[key] = val;
            } else {
                let key = template.positionalArgs[positionalsMatched++];
                namedArgs[key] = arg;
            }
        }
        return namedArgs;
    }

    static parseSubslides(txtReader) {
        let subslides = ["<Title Subslide>"];
        let subslide = [];
        do {
            let line = txtReader.read();
            if ( line.match(/(N|E)$/) ) {
                subslide.push(line.slice(0, -1));
                namedArgs.subslides.push(subslide.join("\n"));
                subslide = [];
            } else {
                subslide.push(line);
            }
        } while (!line.endsWith("E"));
        return subslides;
    }

    static fromTxt(txtReader) {
        let line = txtReader.read();
        let [templateNum, ...args] = line.match(/(\\.|[^,])+/g);

        let template = TEMPLATE_NUM_MAP[templateNum];

        return template.fromTxt(txtReader, args);
    }

    static fromJson(obj) {
        return new TEMPLATE_NAME_MAP[obj.templateName](obj);
    }

    get preview() {
        if (this.#previewOverride)
            return this.#previewOverride;
        
        return this.positionalArgs
            .map(arg => this[arg])
            .filter(x => x)
            .join(" - ");
    }
    set preview(val) {
        this.#previewOverride = val;
    }

    getSlideshowData(subslideIdx) {
        return {
            template: this.templateName,
            fields: Object.fromEntries(
                this.positionalArgs.map(arg => [arg, this[arg]])
            )
        }
    }
}

class WelcomeSlide extends Slide {
    year;
    month;
    day;
    static templateNum = 0;
    static templateName = "welcome";

    constructor(obj) {
        super(obj);

        let {year, month, day} = obj;
        this.year = year;
        this.month = month;
        this.day = day;
    }

    static fromTxt(txtReader, args) {
        let obj = Slide.nameArgs(args, ["year", "month", "day"]);
        return new WelcomeSlide(obj);
    }
}

class BibleSlide extends Slide {
    title;
    location;
    subslides;
    static templateNum = 1;
    static templateName = "bible";

    constructor(obj) {
        super(obj);

        let {title, location, subslides} = obj;
        this.title = title;
        this.location = location;
        this.subslides = subslides;
    }

    static fromTxt(txtReader, args) {
        let obj = Slide.nameArgs(args, ["title", "location"]);
        obj.subslides = Slide.parseSubslides(txtReader);
        return new BibleSlide(obj);
    }

    getSlideshowData(subslideIdx) {
        if (subslideIdx === 0)
            return {template: "subtitle", fields: {title: this.title, subtitle: this.location}};
        return {
            template: "bible",
            fields: {
                title: this.title,
                location: this.location,
                text: this.subslides[subslideIdx]
            },
        }
    }
}

class SongSlide extends Slide {
    title;
    name;
    subslides;
    static subslideType = "definite";
    static templateNum = 2;
    static templateName = "song";

    constructor(obj) {
        super(obj);

        let {title, name, subslides} = obj;
        this.title = title;
        this.name = name;
        this.subslides = subslides;
    }

    static fromTxt(txtReader, args) {
        let obj = Slide.nameArgs(args, ["title", "name"]);
        obj.subslides = Slide.parseSubslides(txtReader);
        return new SongSlide(obj);
    }

    getSlideshowData(subslideIdx) {
        if (subslideIdx === 0)
            return {template: "subtitle", fields: {title: this.title, subtitle: this.name}};
        return {
            template: "song",
            fields: {
                title: this.title,
                name: this.name,
                lyrics: this.subslides[subslideIdx]
            },
        }
    }
}

class TitleSlide extends Slide {
    title;
    subtitle;
    static positionalArgs = ["title", "subtitle"];
    static templateNum = 3;
    static templateName = "title";

    constructor(obj) {
        super(obj);

        let {title, subtitle} = obj;
        this.title = title;
        this.subtitle = subtitle;
    }

    static fromTxt(txtReader, args) {
        let obj = Slide.nameArgs(args, ["title", "subtitle"]);
        return new TitleSlide(obj);
    }

    getSlideshowData(subslideIdx) {
        let data = super.getSlideshowData(this.subslideIdx);
        if (this.subtitle)
            data.template = "subtitle";
        return data;
    }
}

class EmbedSlide extends Slide {
    url;
    static positionalArgs = ["url"];
    static templateNum = 4;
    static templateName = "embed";
    static hasPlaybackControls = true;

    constructor(obj) {
        super(obj);

        let {url} = obj;
        this.url = url;
        this.numSubslides = 1;
    }

    static fromTxt(txtReader, args) {
        let obj = Slide.nameArgs(args, ["url"]);
        return new EmbedSlide(obj);
    }

    getSlideshowData(subslideIdx) {
        return {
            template: "embed",
            elements: [{
                id: "embed",
                dataset: {
                    url: this.url, subslideIdx, slideId: this.id,
                }
            }]
        }
    }
}

class YoutubeSlide extends Slide {
    videoId;
    start;
    end;
    subtitles;
    static templateNum = 5;
    static templateName = "youtube";
    hasPlaybackControls = true;

    constructor(obj) {
        super(obj);

        let {videoId, start, end, subtitles} = obj;
        this.videoId = videoId;
        this.start = start;
        this.end = end;
        this.subtitles = subtitles;
    }

    static fromTxt(txtReader, args) {
        let obj = Slide.nameArgs(args, ["videoId"]);
        return new YoutubeSlide(obj);
    }

    getSlideshowData(subslideIdx) {
        return {
            template: "youtube",
            elements: [{
                id: "player",
                dataset: {
                    videoId: this.videoId,
                    start: this.start, end: this.end,
                    subtitles: this.subtitles,
                }
            }]
        }
    }
}

const TEMPLATE_NUM_MAP = [WelcomeSlide, BibleSlide, TitleSlide, EmbedSlide, YoutubeSlide];
const TEMPLATE_NAME_MAP = Object.fromEntries(
    TEMPLATE_NUM_MAP.map( cls => [cls.templateName, cls] )
)