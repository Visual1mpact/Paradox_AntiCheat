/**
 * @file obfuscate.js
 * Standalone post-build obfuscation script.
 * Reads esbuild output, obfuscates the payload, fragments it into food ES modules
 * based on a randomly selected country/cuisine list, and overwrites
 * 'build/scripts/paradox.js' with an obfuscated module loader.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JavaScriptObfuscator from "javascript-obfuscator";
import { bannerHeader } from "./esbuild.js";

const OUTPUT_DIR = path.resolve("build", "scripts");
const BUNDLE_PATH = path.join(OUTPUT_DIR, "paradox.js");

/** Categorized food lists by country/cuisine (20 items each) */
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
 * Retrieves a randomly selected list of food names from the available dictionaries.
 *
 * @returns {{ country: string, foods: string[] }} The selected cuisine category and food list.
 */
function getRandomFoodList() {
    const countries = Object.keys(FOOD_DICTIONARIES);
    const selectedCountry = countries[Math.floor(Math.random() * countries.length)];
    return {
        country: selectedCountry,
        foods: FOOD_DICTIONARIES[selectedCountry],
    };
}

/**
 * Synchronously writes content and forces an OS disk sync.
 * Eliminates race conditions where 7-Zip reads stale/uncommitted file handles.
 *
 * @param {string} filePath - Destination file path.
 * @param {string} content - Code payload to write.
 */
function writeAndFileSync(filePath, content) {
    const fd = fs.openSync(filePath, "w");
    fs.writeFileSync(fd, content, "utf8");
    fs.fsyncSync(fd);
    fs.closeSync(fd);
}

/**
 * Obfuscates the target bundle and fragments it across modular food files.
 *
 * @returns {Promise<void>}
 */
export async function obfuscateBundle() {
    if (!fs.existsSync(BUNDLE_PATH)) {
        console.error(`[Obfuscator Error] Target bundle not found at: ${BUNDLE_PATH}`);
        process.exit(1);
    }

    const { country, foods: foodList } = getRandomFoodList();
    console.log(`[Obfuscator] Selected '${country}' food list for module fragmentation.`);

    console.log("[Obfuscator] Running single-pass obfuscation on payload...");
    let rawCode = fs.readFileSync(BUNDLE_PATH, "utf8");

    // Remove the esbuild-injected banner header so top-level imports aren't passed to eval()
    if (rawCode.startsWith(bannerHeader)) {
        rawCode = rawCode.slice(bannerHeader.length);
    }

    const obfuscationResult = JavaScriptObfuscator.obfuscate(rawCode, {
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
    });

    const obfuscatedPayload = obfuscationResult.getObfuscatedCode();

    console.log(`[Obfuscator] Fragmenting code across ${foodList.length} ${country} food modules...`);
    const chunkSize = Math.ceil(obfuscatedPayload.length / foodList.length);
    const chunkManifest = [];

    for (let i = 0; i < foodList.length; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, obfuscatedPayload.length);
        const chunkData = obfuscatedPayload.slice(start, end);

        if (chunkData.length === 0) continue;

        const foodName = foodList[i];
        const fileName = `${foodName}.js`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        const moduleContent = `/** Obfuscated chunk: ${foodName} */\nexport const chunk = ${JSON.stringify(chunkData)};\n`;
        writeAndFileSync(filePath, moduleContent);

        chunkManifest.push({ name: foodName, file: fileName });
    }

    console.log("[Obfuscator] Constructing and obfuscating module loader...");

    const foodImports = chunkManifest.map((item, idx) => `import { chunk as c${idx} } from "./${item.file}";`).join("\n");
    const chunkReferences = chunkManifest.map((_, idx) => `c${idx}`).join(", ");

    // Raw loader code without bannerHeader (top-level ESM imports remain static at the top)
    const rawLoaderSource = `${foodImports}

/**
 * Paradox AntiCheat Runtime Loader
 */
(function () {
    const chunks = [${chunkReferences}];
    const fullPayload = chunks.join("");
    (0, eval)(fullPayload);
})();
`;

    // Pass 2: Obfuscate the loader logic (imports, variables, array joining, and eval invocation)
    const obfuscatedLoaderResult = JavaScriptObfuscator.obfuscate(rawLoaderSource, {
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
    });

    // Re-attach bannerHeader on top of the obfuscated loader
    const finalLoaderContent = `${bannerHeader}\n${obfuscatedLoaderResult.getObfuscatedCode()}`;

    writeAndFileSync(BUNDLE_PATH, finalLoaderContent);
    console.log(`[Obfuscator Done] Successfully written obfuscated loader to ${BUNDLE_PATH}`);
}

// Ensure execution ONLY when called directly from CLI
const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
    await obfuscateBundle();
}
