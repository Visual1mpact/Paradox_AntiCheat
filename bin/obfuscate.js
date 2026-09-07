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
    brazilian: [
        "feijoada",
        "pao-de-queijo",
        "acai",
        "brigadeiro",
        "coxinha",
        "picanha",
        "moqueca",
        "farofa",
        "acaraje",
        "vatapa",
        "pastel",
        "beijinho",
        "tapioca",
        "quindim",
        "empada",
        "caipirinha",
        "misto-quente",
        "pave",
        "romeu-e-julieta",
        "bolinho-de-bacalhau",
    ],
    italian_extended: [
        "caprese",
        "panzanella",
        "saltimbocca",
        "vitello-tonnato",
        "ciabatta",
        "affogato",
        "sfogliatella",
        "amaretti",
        "straccatella",
        "cacio-e-pepe",
        "amatriciana",
        "gorgonzola",
        "provolone",
        "zeppole",
        "taralli",
        "biscotti",
        "panelle",
        "caponata",
        "bucatini",
        "grappa",
    ],
    turkish: ["doner", "lahmacun", "pide", "kofta", "borek", "menemen", "manti", "iskender", "baklava", "lokum", "kunefe", "simit", "cacik", "ezme", "dolma", "sarma", "shish-kebab", "boza", "sahlep", "ayran"],
    filipino: ["adobo", "sinigang", "sisig", "lechon", "lumpia", "halo-halo", "pancit", "kare-kare", "bulalo", "crispy-pata", "dinuguan", "bibingka", "puto", "tapsilog", "longganisa", "chicharron", "bicol-express", "ukoy", "turon", "ube-halaya"],
    peruvian: [
        "ceviche",
        "lomo-saltado",
        "causa-rellena",
        "anticuchos",
        "aji-de-gallina",
        "roco-relleno",
        "pisco-sour",
        "pachamanca",
        "arroz-con-pato",
        "papa-a-la-huancaina",
        "tiradito",
        "secode-cabrito",
        "chicha-morada",
        "alfajores",
        "picarones",
        "carapulcra",
        "tamal-peruano",
        "tacacho",
        "juane",
        "sopa-a-la-minuta",
    ],
    ethiopian: ["injera", "doro-wat", "kitfo", "tibs", "shiro", "misir-wat", "gomen", "atrikilt-wat", "azifa", "firfir", "chechebsa", "kik-alicha", "dullet", "tej", "genfo", "buna", "sambusa", "fatira", "kinche", "ayib"],
    moroccan: ["tagine", "couscous", "pastilla", "harira", "chermoula", "zaalouk", "rfissa", "makroudh", "chebakia", "seffa", "sellou", "mechoui", "bessara", "briouat", "msemmen", "baghrir", "khobz", "maakouda", "kefta", "tajine-zitoun"],
    jamaican: [
        "jerk-pork",
        "ackee",
        "saltfish",
        "callaloo",
        "escovitch",
        "bammy",
        "festival",
        "hardo-bread",
        "run-down",
        "gizzada",
        "grater-cake",
        "curry-goat",
        "brown-stew",
        "stew-peas",
        "solomon-gundy",
        "bulla-cake",
        "corned-pork",
        "mannish-water",
        "stamp-and-go",
        "totoras",
    ],
    polish: ["pierogi", "bigos", "barszcz", "zapiekanka", "kotlet-schabowy", "golabki", "zurek", "placki-ziemniaczane", "kielbasa", "krupnik", "sernik", "paczki", "faworki", "mizeria", "makowiec", "kluski", "flaki", "golonka", "kompot", "oscypek"],
    indonesian: [
        "nasi-goreng",
        "rendang",
        "satay-ayam",
        "gado-gado",
        "soto-ayam",
        "bakso",
        "pempek",
        "rawon",
        "nasi-uduk",
        "ayam-goreng",
        "martabak",
        "tempeh",
        "sayur-asem",
        "otak-otak",
        "klepon",
        "gudeg",
        "nasi-kunut",
        "babi-guling",
        "soto-betawi",
        "rujak",
    ],
    malaysian: [
        "nasi-lemak",
        "laksa",
        "char-kway-teow",
        "roti-canai",
        "rendang-daging",
        "hainan-chicken",
        "satay-daging",
        "cendol",
        "ais-kacang",
        "nasi-kandar",
        "otak-otak",
        "bak-kut-teh",
        "mee-goreng",
        "pan-mee",
        "curry-laksa",
        "kuih-dadar",
        "ayam-percik",
        "popiah",
        "lor-bak",
        "asam-pedas",
    ],
    russian: [
        "borscht",
        "pelmeni",
        "beef-stroganoff",
        "blini",
        "shashlik",
        "pierogi-ruskie",
        "syrniki",
        "vareniki",
        "solyanka",
        "ukha",
        "kasha",
        "kholodets",
        "okroshka",
        "medovik",
        "prazhsky",
        "pirozhki",
        "chebureki",
        "draniki",
        "vatrushka",
        "mors",
    ],
    lebanese: [
        "kibbeh-nayyeh",
        "shawarma-chicken",
        "fatayer",
        "hummus-beiruti",
        "moutabal",
        "sambousek",
        "shanklish",
        "sayadieh",
        "batata-harra",
        "shish-taouk",
        "kafta-halabiya",
        "freekeh",
        "kousa-mahshi",
        "knefeh",
        "maamoul",
        "namoura",
        "ayran-drink",
        "arak",
        "jallab",
        "mezza",
    ],
    portuguese: [
        "bacalhau-a-bras",
        "francesinha",
        "pastel-de-nata",
        "caldo-verde",
        "polvo-a-lagareiro",
        "sardinhas-assadas",
        "alheira",
        "arroz-de-pato",
        "cozido-a-portuguesa",
        "feijoada-transmontana",
        "tripas-a-moda-do-porto",
        "amijoas-a-bulhao-pato",
        "cataplana",
        "queijada",
        "travesseiro",
        "pao-de-lo",
        "arroz-doce",
        "broa-de-milho",
        "chourico-assado",
        "ginjinha",
    ],
    nigerian: [
        "jollof-rice",
        "egusi-soup",
        "pounded-yam",
        "suya",
        "eform-riro",
        "moin-moin",
        "pepper-soup",
        "akara",
        "amala",
        "ewedu",
        "ogbono-soup",
        "bang-soup",
        "kilishi",
        "puff-puff",
        "chin-chin",
        "ofada-rice",
        "okra-soup",
        "isi-ewu",
        "nkwobi",
        "bole",
    ],
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
