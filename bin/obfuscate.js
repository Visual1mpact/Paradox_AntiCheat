/**
 * @file obfuscate.js
 * Standalone post-build obfuscation script.
 * Reads esbuild output, obfuscates the payload, fragments it into Italian food ES modules,
 * and overwrites 'build/scripts/paradox.js' with a module loader.
 */

import fs from "node:fs";
import path from "node:path";
import JavaScriptObfuscator from "javascript-obfuscator";

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
 * Obfuscates the target bundle and fragments it across modular food files.
 *
 * @param {boolean} [isMcpack] - Explicitly force MCPACK mode if true, ZIP mode if false.
 */
export async function obfuscateBundle(isMcpack = process.argv.includes("--mcpack")) {
    if (!fs.existsSync(BUNDLE_PATH)) {
        console.error(`[Obfuscator Error] Target bundle not found at: ${BUNDLE_PATH}`);
        process.exit(1);
    }

    console.log(`[Obfuscator] Generating loader for [${isMcpack ? "MCPACK / Realms" : "ZIP / BDS"}]...`);
    const rawCode = fs.readFileSync(BUNDLE_PATH, "utf8");

    console.log("[Obfuscator] Obfuscating source payload...");
    const obfuscationResult = JavaScriptObfuscator.obfuscate(rawCode, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: false,
        identifierNamesGenerator: "hexadecimal",
        renameGlobals: false,
        selfDefending: false,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.75,
        target: "browser",
    });

    const obfuscatedPayload = obfuscationResult.getObfuscatedCode();

    console.log(`[Obfuscator] Fragmenting code across ${ITALIAN_FOODS.length} Italian food modules...`);
    const chunkSize = Math.ceil(obfuscatedPayload.length / ITALIAN_FOODS.length);
    const chunkManifest = [];

    // Split payload across food-named files
    for (let i = 0; i < ITALIAN_FOODS.length; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, obfuscatedPayload.length);
        const chunkData = obfuscatedPayload.slice(start, end);

        if (chunkData.length === 0) continue;

        const foodName = ITALIAN_FOODS[i];
        const fileName = `${foodName}.js`;
        const filePath = path.join(OUTPUT_DIR, fileName);

        const moduleContent = `/** Obfuscated chunk: ${foodName} */\nexport const chunk = ${JSON.stringify(chunkData)};\n`;
        fs.writeFileSync(filePath, moduleContent, "utf8");

        chunkManifest.push({ name: foodName, file: fileName });
    }

    console.log("[Obfuscator] Rewriting 'paradox.js' as the module loader entry point...");

    // Generate loader imports
    const foodImports = chunkManifest.map((item, idx) => `import { chunk as c${idx} } from "./${item.file}";`).join("\n");
    const chunkReferences = chunkManifest.map((_, idx) => `c${idx}`).join(", ");

    // Target-specific module imports and global mappings
    const nativeImports = isMcpack
        ? `import * as mcServer from "@minecraft/server";
import * as mcUI from "@minecraft/server-ui";`
        : `import * as mcServer from "@minecraft/server";
import * as mcUI from "@minecraft/server-ui";
import * as mcAdmin from "@minecraft/server-admin";
import * as mcDebug from "@minecraft/debug-utilities";
import * as mcServerNet from "@minecraft/server-net";`;

    const globalMappings = isMcpack
        ? `    "@minecraft/server": mcServer,
    "@minecraft/server-ui": mcUI`
        : `    "@minecraft/server": mcServer,
    "@minecraft/server-ui": mcUI,
    "@minecraft/server-admin": mcAdmin,
    "@minecraft/debug-utilities": mcDebug,
    "@minecraft/server-net": mcServerNet`;

    const loaderContent = `/** Native Bedrock API imports */
${nativeImports}

// Bind native modules to global scope before dynamic payload evaluation
globalThis.__mc__ = {
${globalMappings}
};

${foodImports}

/**
 * Paradox AntiCheat Runtime Loader
 */
(function () {
    const chunks = [${chunkReferences}];
    const fullPayload = chunks.join("");
    (0, eval)(fullPayload);
})();
`;

    fs.writeFileSync(BUNDLE_PATH, loaderContent, "utf8");
    console.log(`[Obfuscator Done] Successfully written loader to ${BUNDLE_PATH}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename || "")) {
    obfuscateBundle();
}
