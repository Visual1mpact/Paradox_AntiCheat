import path from "path";
import fs from "fs-extra";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

// Constants
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Execute version-sync.js to ensure versions are synchronized
console.log("\nSyncing version with version-sync.js...");
const versionSyncResult = spawnSync("node", ["./bin/version-sync.js"], { stdio: "inherit" });

if (versionSyncResult.status !== 0) {
    console.error("Version synchronization failed.");
    process.exit(1); // Exit with error code if version sync fails
}

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
const esbuildResult = spawnSync("node", ["./bin/esbuild.js"], {
    stdio: "inherit", // Directly forward output to the parent process
});

if (esbuildResult.status !== 0) {
    console.error("Esbuild failed:");
    if (esbuildResult.stderr && esbuildResult.stderr.length > 0) {
        console.error(esbuildResult.stderr.toString());
    } else if (esbuildResult.stdout && esbuildResult.stdout.length > 0) {
        console.error(esbuildResult.stdout.toString());
    }
    process.exit(1); // Exit with non-zero status to indicate failure
}

// Build project using TypeScript
console.log("Building the project");
const tsConfigPath = path.resolve("./tsconfig.json");
const tsResult = spawnSync("node", ["./node_modules/typescript/bin/tsc", "-p", tsConfigPath], {
    stdio: "inherit", // Directly forward output to the parent process
});

// Check TypeScript compilation result
if (tsResult.status !== 0) {
    console.error("TypeScript compilation failed:");
    if (tsResult.stderr && tsResult.stderr.length > 0) {
        console.error(tsResult.stderr.toString());
    } else if (tsResult.stdout && tsResult.stdout.length > 0) {
        console.error(tsResult.stdout.toString());
    }
    process.exit(1); // Exit with non-zero status to indicate failure
}

// Check if --server parameter is present
const isServerMode = process.argv.includes("--server");

if (!isServerMode) {
    console.log("Creating distribution archive file");

    const outputFileName = `Paradox-AntiCheat-v${packageVersion}.${process.argv.includes("--mcpack") ? "mcpack" : "zip"}`;
    const outputFilePath = path.resolve("build/build", outputFileName);

    // Delete existing archive if it exists
    if (fs.existsSync(outputFilePath)) {
        console.log(`Removing existing archive: ${outputFilePath}`);
        fs.unlinkSync(outputFilePath);
    }

    // Explicitly specify the archive format
    const zipResult = spawnSync("7z", ["a", `-tzip`, outputFilePath, "CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png", "scripts"], { cwd: "build" });

    // Check zip command result
    if (zipResult.status !== 0) {
        console.error("Error creating distribution zip file:");
        console.error(zipResult.stderr?.toString() || zipResult.stdout?.toString());
        process.exit(1);
    }

    console.log(`Archive created successfully: ${outputFilePath}`);
}

console.log("Build process completed successfully.");
