// esbuild.js
import esbuild from "esbuild";
import path from "node:path";
import fs from "fs-extra";

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

/** Header banner injected at the very top of paradox.js */
export const bannerHeader = `/** Native Bedrock API imports */
import * as mcServer from "@minecraft/server";
import * as mcUI from "@minecraft/server-ui";

let mcAdmin, mcDebug, mcServerNet;
try { mcAdmin = await import("@minecraft/server-admin"); } catch {}
try { mcDebug = await import("@minecraft/debug-utilities"); } catch {}
try { mcServerNet = await import("@minecraft/server-net"); } catch {}

// Bind native modules to global scope before execution
globalThis.__mc__ = {
    "@minecraft/server": mcServer,
    "@minecraft/server-ui": mcUI,
    "@minecraft/server-admin": mcAdmin,
    "@minecraft/debug-utilities": mcDebug,
    "@minecraft/server-net": mcServerNet
};
`;

async function buildBundle() {
    const outputDir = path.resolve("build", "scripts");
    await fs.ensureDir(outputDir);

    console.log("[esbuild] Building bundle...");
    await esbuild.build({
        entryPoints: ["penrose/paradox.ts"],
        outfile: path.join(outputDir, "paradox.js"),
        bundle: true,
        format: "esm",
        target: "es2020",
        platform: "node",
        minify: false,
        banner: {
            js: bannerHeader,
        },
        plugins: [minecraftGlobalsPlugin],
    });
    console.log("[esbuild] Bundle complete.");
}

buildBundle().catch((err) => {
    console.error("[esbuild Error]:", err);
    process.exit(1);
});
