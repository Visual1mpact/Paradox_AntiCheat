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

// Check if --server parameter is present
const isServerMode = process.argv.includes("--server");

if (!isServerMode) {
    // Run the 7z command to create the archive
    const sevenZipPath = path7za;
    const outputFileName = `Paradox-AntiCheat-v${packageVersion}.${process.argv.includes("--mcpack") ? "mcpack" : "zip"}`;
    const outputFilePath = path.resolve("build/build", outputFileName);

    console.log("Creating distribution archive file");

    // Delete existing archive if it exists
    if (fs.existsSync(outputFilePath)) {
        console.log(`Removing existing archive: ${outputFilePath}`);
        fs.unlinkSync(outputFilePath);
    }

    // List of files to include
    const filesToInclude = [
        "CHANGELOG.md",
        "LICENSE",
        "README.md",
        "manifest.json",
        "pack_icon.png",
        "scripts\\*", // Include all contents of 'scripts' directory
    ];

    // Print resolved paths for debugging
    console.log("Verifying paths to files and directories:");
    filesToInclude.forEach((file) => {
        const resolvedPath = path.resolve("build", file.replace("\\*", "")); // Strip wildcard for fs check
        const exists = fs.existsSync(resolvedPath);
        console.log(`- ${file}: ${resolvedPath} (${exists ? "FOUND" : "NOT FOUND"})`);
    });

    // Change working directory to "build" so files are added without the "build/" prefix
    const result = runCommand(sevenZipPath, ["a", "-tzip", outputFilePath, ...filesToInclude], {
        cwd: "build", // Set working directory to 'build'
    });

    // Check for system-level error
    if (result.error) {
        console.error(`Error while creating distribution archive: ${result.error.message}`);
        process.exit(1); // Exit the process for system-level errors
    }

    console.log(`Archive created successfully: ${outputFilePath}`);
}

console.log("Build process completed successfully.");
