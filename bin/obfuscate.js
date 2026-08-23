/**
 * @file obfuscate.js
 * Unified post-build obfuscation script.
 * Fragments payload into food modules and obfuscates the entire module loader framework.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JavaScriptObfuscator from "javascript-obfuscator";
import { bannerHeader } from "./esbuild.js";

const OUTPUT_DIR = path.resolve("build", "scripts");
const BUNDLE_PATH = path.join(OUTPUT_DIR, "paradox.js");

/** List of 20 Italian foods used for module fragment names */
const ITALIAN_FOODS = [
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
];

/**
 * Safely splits a string into chunks without cutting through multi-byte Unicode
 * surrogate pairs or broken escape sequences.
 *
 * @param {string} str - String to split.
 * @param {number} numChunks - Target number of chunks.
 * @returns {string[]} Array of string fragments.
 */
function safeChunkString(str, numChunks) {
    const chars = Array.from(str); // Respects multi-byte Unicode code points
    const chunkSize = Math.ceil(chars.length / numChunks);
    const chunks = [];

    for (let i = 0; i < chars.length; i += chunkSize) {
        chunks.push(chars.slice(i, i + chunkSize).join(""));
    }
    return chunks;
}

/**
 * Synchronously writes content to disk.
 *
 * @param {string} filePath - Destination file path.
 * @param {string} content - Code payload to write.
 */
function writeFileSync(filePath, content) {
    fs.writeFileSync(filePath, content, "utf8");
}

/**
 * Obfuscates target code and wraps the loader logic in a single obfuscation pass.
 *
 * @returns {Promise<void>}
 */
export async function obfuscateBundle() {
    if (!fs.existsSync(BUNDLE_PATH)) {
        console.error(`[Obfuscator Error] Target bundle not found at: ${BUNDLE_PATH}`);
        process.exit(1);
    }

    console.log("[Obfuscator] Processing payload and chunking...");
    let rawCode = fs.readFileSync(BUNDLE_PATH, "utf8");

    if (rawCode.startsWith(bannerHeader)) {
        rawCode = rawCode.slice(bannerHeader.length);
    }

    // 1. Chunk the raw code safely BEFORE obfuscation
    const chunks = safeChunkString(rawCode, ITALIAN_FOODS.length);
    const chunkManifest = [];

    for (let i = 0; i < chunks.length; i++) {
        const foodName = ITALIAN_FOODS[i];
        const fileName = `${foodName}.js`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        // Export raw chunks from food modules
        const moduleContent = `/** Chunk: ${foodName} */\nexport const chunk = ${JSON.stringify(chunks[i])};\n`;
        writeFileSync(filePath, moduleContent);

        chunkManifest.push({ name: foodName, file: fileName });
    }

    // 2. Build the un-obfuscated loader source code
    const foodImports = chunkManifest.map((item, idx) => `import { chunk as c${idx} } from "./${item.file}";`).join("\n");
    const chunkReferences = chunkManifest.map((_, idx) => `c${idx}`).join(", ");

    const rawLoaderSource = `${foodImports}

(function () {
    const chunks = [${chunkReferences}];
    const fullPayload = chunks.join("");
    (0, eval)(fullPayload);
})();
`;

    // 3. Obfuscate the ENTIRE loader script (imports, references, and execution logic)
    console.log("[Obfuscator] Running unified obfuscation pass on loader and payload logic...");
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
    });

    // 4. Prepend bannerHeader back onto the final output
    const finalOutput = `${bannerHeader}\n${obfuscatedLoader.getObfuscatedCode()}`;
    writeFileSync(BUNDLE_PATH, finalOutput);

    console.log(`[Obfuscator Done] Successfully protected loader written to ${BUNDLE_PATH}`);
}

// CLI Execution Check
const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
    await obfuscateBundle();
}
