import esbuild from "esbuild";
import path from "path";
import fs from "fs/promises";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Define modules
const modulesToConvert = [
    "./node_modules/@minecraft/math/dist/minecraft-math.js", // direct file path
    "crypto-es", // package name, dynamic resolution
];

// Output directory
const outputDir = "./build/scripts/node_modules";

async function ensureDirExists(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (err) {
        if (err.code !== "EEXIST") throw err;
    }
}

// Resolve package entry if it’s an npm package
function resolveModuleEntry(moduleName) {
    if (moduleName.startsWith(".")) return moduleName; // local file, return as-is
    try {
        return require.resolve(moduleName); // npm package
    } catch (err) {
        console.error(`Cannot resolve module "${moduleName}":`, err.message);
        return null;
    }
}

async function buildModules() {
    try {
        await ensureDirExists(outputDir);

        const buildPromises = modulesToConvert.map(async (moduleName) => {
            const entry = resolveModuleEntry(moduleName);
            if (!entry) return; // skip unresolved modules

            let outPath;

            if (moduleName.includes("@minecraft/math")) {
                // Preserve folder structure for minecraft-math
                const relativePath = path.relative("./node_modules", entry);
                outPath = path.join(outputDir, relativePath);
            } else {
                // Flatten other packages like crypto-es
                const baseName = moduleName.startsWith(".") ? path.basename(moduleName) : moduleName + ".js";
                outPath = path.join(outputDir, baseName);
            }

            await ensureDirExists(path.dirname(outPath));

            await esbuild.build({
                entryPoints: [entry],
                outfile: outPath,
                format: "esm",
                target: "esnext",
                bundle: true,
                platform: "node",
                external: entry.includes("minecraft-math") ? ["@minecraft/server"] : [],
            });

            console.log(`Converted: ${moduleName} -> ${outPath}`);
        });

        await Promise.all(buildPromises);
        console.log("All modules converted successfully!");
    } catch (err) {
        console.error("Error during module conversion:", err);
    }
}

buildModules();
