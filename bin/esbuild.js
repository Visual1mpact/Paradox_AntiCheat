import esbuild from "esbuild";
import path from "path";
import fs from "fs/promises"; // Use promises API for better async handling

// Define input modules
const modulesToConvert = ["./node_modules/@minecraft/math/dist/minecraft-math.js", "./node_modules/crypto-es/dist/index.js"];

// Output directory
const outputDir = "./build/scripts/node_modules";

async function ensureDirExists(dir) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (error) {
        if (error.code !== "EEXIST") throw error;
    }
}

// Build all modules
async function buildModules() {
    try {
        // Ensure output directory exists
        await ensureDirExists(outputDir);

        // Build each module
        const buildPromises = modulesToConvert.map(async (entry) => {
            const relativePath = path.relative("./node_modules", entry); // Get the relative path from node_modules
            const outPath = path.join(outputDir, relativePath); // Maintain folder structure in output

            // Ensure the output folder structure exists
            await ensureDirExists(path.dirname(outPath));

            // Build the module with esbuild
            await esbuild.build({
                entryPoints: [entry], // Input file
                outfile: outPath, // Output file
                format: "esm", // Output in ESM format
                target: "esnext", // Target modern ESM
                bundle: true, // Bundle dependencies
                platform: "node", // Platform is Node.js
            });

            console.log(`Converted: ${entry} -> ${outPath}`);
        });

        // Wait for all builds to complete
        await Promise.all(buildPromises);

        console.log("All modules converted successfully!");
    } catch (err) {
        console.error("Error during module conversion:", err);
    }
}

buildModules();
