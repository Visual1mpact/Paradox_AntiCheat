/**
 * @file esbuild.js
 * Configures esbuild to output IIFE syntax and shim Minecraft Bedrock native imports.
 */

import esbuild from "esbuild";
import path from "node:path";
import fs from "fs-extra";
import { obfuscateBundle } from "./obfuscate.js";

/**
 * Custom esbuild plugin to replace native @minecraft/* imports with global scope lookups.
 */
const minecraftGlobalsPlugin = {
    name: "minecraft-globals-shim",
    setup(build) {
        build.onResolve({ filter: /^@minecraft\// }, (args) => {
            return { path: args.path, namespace: "mc-global-ns" };
        });

        build.onLoad({ filter: /.*/, namespace: "mc-global-ns" }, (args) => {
            const moduleKey = args.path;
            return {
                contents: `module.exports = globalThis.__mc__["${moduleKey}"];`,
                loader: "js",
            };
        });
    },
};

async function buildBundle() {
    const outputDir = path.resolve("build", "scripts");
    await fs.ensureDir(outputDir);

    try {
        console.log("[esbuild] Building bundle...");
        await esbuild.build({
            entryPoints: ["penrose/paradox.ts"],
            outfile: path.join(outputDir, "paradox.js"),
            bundle: true,
            format: "iife", // IIFE prevents top-level export/import statements inside the bundle
            target: "es2020",
            platform: "node",
            minify: false,
            plugins: [minecraftGlobalsPlugin],
        });

        console.log("[esbuild] Bundle complete. Running obfuscator...");
        //await obfuscateBundle();
    } catch (err) {
        console.error("[esbuild Error]:", err);
        process.exit(1);
    }
}

buildBundle();
