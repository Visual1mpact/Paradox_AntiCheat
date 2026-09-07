import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JavaScriptObfuscator from "javascript-obfuscator";
import { bannerHeader } from "./esbuild.js";

const OUTPUT_DIR = path.resolve("build", "scripts");
const BUNDLE_PATH = path.join(OUTPUT_DIR, "paradox.js");

/** Categorized food lists by country/cuisine */
const FOOD_DICTIONARIES = {
    italian: [
        "pizza",
        "risotto",
        "lasagna",
        "gnocchi",
        "focaccia",
        "carbonara",
        "arancini",
        "ravioli",
        "polenta",
        "bruschetta",
        "tiramisu",
        "cannoli",
        "panettone",
        "gelato",
        "prosciutto",
        "calzone",
        "porchetta",
        "carpaccio",
        "ossobuco",
        "minestrone",
    ],
    japanese: ["sushi", "ramen", "tempura", "sashimi", "yakitori", "tonkatsu", "udon", "soba", "okonomiyaki", "takoyaki", "matcha", "miso", "gyoza", "unagi", "teriyaki", "sukiyaki", "onigiri", "edamame", "taiyaki", "dango"],
    mexican: ["tacos", "burrito", "enchilada", "tamales", "quesadilla", "guacamole", "chiles", "tostadas", "pozole", "mole", "churros", "flautas", "carnitas", "birria", "elote", "fajitas", "horchata", "nachos", "empanada", "chalupa"],
    french: [
        "baguette",
        "croissant",
        "ratatouille",
        "quiche",
        "crepe",
        "souffle",
        "escargot",
        "brioche",
        "macaron",
        "eclair",
        "bouillabaisse",
        "cassoulet",
        "fondue",
        "profiterole",
        "tartiflette",
        "galette",
        "madeleine",
        "cannele",
        "mousse",
        "meringue",
    ],
    indian: ["samosa", "biryani", "tikka", "naan", "curry", "dosa", "paneer", "roti", "dal", "pakora", "gulab", "jalebi", "vada", "chana", "paratha", "lassi", "korma", "vindaloo", "halwa", "idli"],
    american: ["burger", "hotdog", "pancakes", "waffles", "brownie", "brisket", "cornbread", "meatloaf", "jambalaya", "gumbo", "chowder", "biscuits", "cheesesteak", "shortcake", "cobbler", "doughnut", "milkshake", "sundae", "pretzels", "potpie"],
    chinese: ["wonton", "dumpling", "pekingduck", "mapotofu", "chowmein", "baozi", "springroll", "charxiu", "xiaolongbao", "kungpao", "hotpot", "scallionpancake", "zongzi", "mooncakes", "congee", "boba", "danfun", "tangyuan", "youtiao", "hainanese"],
    thai: [
        "padthai",
        "tomyum",
        "somtum",
        "khao-soi",
        "green-curry",
        "massaman",
        "panang",
        "larb",
        "pad-krapow",
        "sticky-rice",
        "satay",
        "tom-kha",
        "pad-see-ew",
        "roti-sai-mai",
        "tod-mun",
        "nam-tok",
        "khao-pad",
        "boat-noodles",
        "pla-rad-prik",
        "khanom-chan",
    ],
    spanish: [
        "paella",
        "tapas",
        "gazpacho",
        "jamon",
        "tortilla-espanola",
        "churros-con-chocolate",
        "croquetas",
        "patatas-bravas",
        "sangria",
        "salmorejo",
        "fabada",
        "pimientos-padron",
        "turron",
        "pulpo-gallega",
        "leche-frita",
        "crema-catalana",
        "empanada-gallega",
        "pan-con-tomate",
        "escalivada",
        "gambas-al-ajillo",
    ],
    greek: [
        "moussaka",
        "souvlaki",
        "gyros",
        "spanakopita",
        "tzatziki",
        "baklava",
        "dolmades",
        "feta",
        "calamari",
        "kleftiko",
        "tiropita",
        "pastitsio",
        "loukoumades",
        "stifado",
        "fasolada",
        "saganaki",
        "taramasalata",
        "galaktoboureko",
        "koupes",
        "skewers",
    ],
    korean: [
        "kimchi",
        "bibimbap",
        "bulgogi",
        "tteokbokki",
        "japchae",
        "samgyeopsal",
        "kimbap",
        "sundubu",
        "galbi",
        "haemul-pajeon",
        "bingsu",
        "jajangmyeon",
        "gamjatang",
        "naengmyeon",
        "mandu",
        "hotteok",
        "bossam",
        "chimaek",
        "doenjang",
        "yangnyeom",
    ],
    german: [
        "bratwurst",
        "schnitzel",
        "sauerkraut",
        "pretzel",
        "strudel",
        "spätzle",
        "currywurst",
        "knödel",
        "kartoffelsalat",
        "sauerbraten",
        "eisbein",
        "schwarzwälder",
        "leberkäse",
        "flammkuchen",
        "rouladen",
        "stollen",
        "königsberger",
        "frikadellen",
        "obatzda",
        "schweinshaxe",
    ],
    vietnamese: [
        "pho",
        "banh-mi",
        "bun-cha",
        "goi-cuon",
        "banh-xèo",
        "cao-lau",
        "bun-bo-hue",
        "cha-ca",
        "com-tam",
        "banh-bot-loc",
        "che",
        "egg-coffee",
        "banh-cuon",
        "bun-rieu",
        "hu-tieu",
        "canh-chua",
        "bo-la-lot",
        "banh-cung",
        "mi-quang",
        "nem-nuong",
    ],
    caribbean: [
        "jerk-chicken",
        "plantains",
        "roti-wrap",
        "callaloo",
        "ackee-saltfish",
        "doubles",
        "rice-and-peas",
        "mofongo",
        "tostones",
        "griot",
        "patties",
        "chivo-guisado",
        "coquito",
        "pastelitos",
        "rundown",
        "oil-down",
        "pepperpot",
        "cou-cou",
        "sorrel",
        "pigeon-peas",
    ],
    middle_eastern: ["shawarma", "falafel", "hummus", "tabbouleh", "baba-ganoush", "kebab", "fattoush", "kunafa", "mansaf", "manakish", "shakshuka", "labneh", "kibbeh", "muhammara", "kafta", "halva", "dolma", "koshary", "mujaddara", "baklawa"],
};

/**
 * Retrieves a random cuisine and word array.
 *
 * @returns {{ country: string, foods: string[] }} Selected dictionary entry.
 */
function getRandomFoodList() {
    const countries = Object.keys(FOOD_DICTIONARIES);
    const selectedCountry = countries[Math.floor(Math.random() * countries.length)];
    return { country: selectedCountry, foods: FOOD_DICTIONARIES[selectedCountry] };
}

/**
 * Writes payload and flushes buffer directly to disk.
 *
 * @param {string} filePath - Path to file.
 * @param {string} content - Data string.
 * @returns {void}
 */
function writeAndFileSync(filePath, content) {
    const fd = fs.openSync(filePath, "w");
    fs.writeFileSync(fd, content, "utf8");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
}

/**
 * Encrypts and splits payload code chunks into food module files.
 *
 * @param {string} rawCode - Source script string.
 * @param {string[]} foodList - Array of food module names.
 * @returns {Array<{name: string, file: string}>} Array of file descriptors.
 */
function fragmentPayload(rawCode, foodList) {
    const obfuscatedPayload = JavaScriptObfuscator.obfuscate(rawCode, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        identifierNamesGenerator: "hexadecimal",
        renameGlobals: true,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.75,
        target: "node",
    }).getObfuscatedCode();

    const chunkSize = Math.ceil(obfuscatedPayload.length / foodList.length);
    const manifest = [];

    for (let i = 0; i < foodList.length; i++) {
        const start = i * chunkSize;
        const chunkData = obfuscatedPayload.slice(start, start + chunkSize);
        if (!chunkData) continue;

        const foodName = foodList[i];
        const fileName = `${foodName}.js`;
        writeAndFileSync(path.join(OUTPUT_DIR, fileName), `/** Obfuscated chunk: ${foodName} */\nexport const chunk = ${JSON.stringify(chunkData)};\n`);
        manifest.push({ name: foodName, file: fileName });
    }

    return manifest;
}

/**
 * Obfuscates the runtime loader engine.
 *
 * @returns {Promise<void>}
 */
export async function obfuscateBundle() {
    if (!fs.existsSync(BUNDLE_PATH)) {
        console.error(`[Obfuscator Error] Target bundle not found at: ${BUNDLE_PATH}`);
        process.exit(1);
    }

    const { country, foods: foodList } = getRandomFoodList();
    console.log(`[Obfuscator] Selected '${country}' list for module fragmentation.`);

    let rawCode = fs.readFileSync(BUNDLE_PATH, "utf8");
    if (rawCode.startsWith(bannerHeader)) {
        rawCode = rawCode.slice(bannerHeader.length);
    }

    const chunkManifest = fragmentPayload(rawCode, foodList);

    const foodImports = chunkManifest.map((item, idx) => `import { chunk as c${idx} } from "./${item.file}";`).join("\n");
    const chunkReferences = chunkManifest.map((_, idx) => `c${idx}`).join(", ");
    const rawLoaderSource = `${foodImports}\n(function(){(0,eval)([${chunkReferences}].join(""));})();`;

    const obfuscatedLoader = JavaScriptObfuscator.obfuscate(rawLoaderSource, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: true,
        identifierNamesGenerator: "hexadecimal",
        renameGlobals: true,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 8,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.8,
        target: "node",
    }).getObfuscatedCode();

    writeAndFileSync(BUNDLE_PATH, `${bannerHeader}\n${obfuscatedLoader}`);
    console.log(`[Obfuscator Done] Successfully written loader to ${BUNDLE_PATH}`);
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
    await obfuscateBundle();
}
