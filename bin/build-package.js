// Import required modules
import path from "path";
import fs from "fs-extra";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { path7za } from "7zip-bin";

// Constants
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Function to run a command and handle errors
function runCommand(command, args, options = {}) {
    const result = spawnSync(command, args, { stdio: "inherit", ...options });

    if (result.status !== 0) {
        console.error(`${command} failed with code ${result.status}:`);
        if (result.stderr && result.stderr.length > 0) {
            console.error(result.stderr.toString());
        } else if (result.stdout && result.stdout.length > 0) {
            console.error(result.stdout.toString());
        }
        process.exit(1); // Exit immediately if the command fails
    }
    return result;
}

// Execute version-sync.js to ensure versions are synchronized
console.log("\nSyncing version with version-sync.js...");
runCommand("node", ["./bin/version-sync.js"]);

// Read package.json to get the version
const packageJson = fs.readJsonSync("package.json");
const packageVersion = packageJson.version;

// Clean build directory
console.log("Cleaning build directory");
fs.removeSync("build");

// Create necessary directories
console.log("Creating build directory");
fs.mkdirSync("build", { recursive: true });

// Copy assets
console.log("Copying assets");
const assets = ["CHANGELOG.md", "LICENSE", "manifest.json", "pack_icon.png", "README.md"];
assets.forEach((asset) => {
    fs.copyFileSync(asset, path.join("build", asset));
});

// Bundle penrose/node_modules to build/scripts/node_modules
console.log("Running esbuild for bundling");
runCommand("node", ["./bin/esbuild.js"]);

// Build project using TypeScript
console.log("Building the project");
const tsConfigPath = path.resolve("./tsconfig.json");
runCommand("node", ["./node_modules/typescript/bin/tsc", "-p", tsConfigPath]);

// Helper function to create an archive
function createArchive(outputFileName, manifestModifier = null) {
    const outputFilePath = path.resolve("build", outputFileName);

    // Apply manifest modification if provided
    const manifestPath = path.join("build", "manifest.json");
    if (manifestModifier) {
        console.log(`Modifying manifest.json for ${outputFileName}...`);
        const manifest = fs.readJsonSync(manifestPath);
        manifestModifier(manifest);
        fs.writeJsonSync(manifestPath, manifest, { spaces: 2 });
    }

    // Remove existing archive if it exists
    if (fs.existsSync(outputFilePath)) {
        console.log(`Removing existing archive: ${outputFilePath}`);
        fs.unlinkSync(outputFilePath);
    }

    // Create the archive
    console.log(`Creating archive: ${outputFileName}`);
    const filesToInclude = [
        "CHANGELOG.md",
        "LICENSE",
        "README.md",
        "manifest.json",
        "pack_icon.png",
        "scripts/*", // Include all contents of 'scripts' directory
    ];
    runCommand(path7za, ["a", "-tzip", outputFilePath, ...filesToInclude], { cwd: "build" });

    console.log(`Archive created successfully: ${outputFilePath}`);
}

// Create a BDS (zip) build
createArchive(`Paradox-AntiCheat-v${packageVersion}-BDS.zip`);

// Create a Realms (mcpack) build if --mcpack is specified
if (process.argv.includes("--mcpack")) {
    createArchive(`Paradox-AntiCheat-v${packageVersion}-REALMS.mcpack`, (manifest) => {
        // Remove the @minecraft/server-net dependency
        manifest.dependencies = manifest.dependencies.filter((dep) => dep.module_name !== "@minecraft/server-net");
    });
}

console.log("Build process completed successfully.");
