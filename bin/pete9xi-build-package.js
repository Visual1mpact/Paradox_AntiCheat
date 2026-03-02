import path from "path";
import fs from "fs-extra";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { path7za } from "7zip-bin";

// Get the current directory using import.meta.url
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read package.json without using experimental JSON import
const packageJson = fs.readJsonSync(path.resolve("./package.json"));

// Constants
const BUILD_DIR = "build";
const PERSONAL_DIR = "pete9xi";
const TSC_ALIAS = path.join("./node_modules", ".bin", process.platform === "win32" ? "tsc-alias.cmd" : "tsc-alias");

/**
 * Logs a message and exits the process with an error code.
 *
 * @param {string} message - The error message to log.
 */
function exitWithError(message) {
    console.error(message);
    process.exit(1);
}

/**
 * Ensures the build directory exists or exits the process with an error.
 *
 * @returns {string} - The path of the build directory.
 */
function ensureBuildDirectory() {
    if (!fs.existsSync(BUILD_DIR)) {
        exitWithError(`${BUILD_DIR} directory not found. Please run the main build script first.`);
    }
    return BUILD_DIR;
}

/**
 * Overlays files from a source directory into a destination directory,
 * excluding specified directories and files like tsconfig.json.
 *
 * @param {string} srcDir - The source directory.
 * @param {string} destDir - The destination directory.
 * @param {string[]} excludeDirs - Directories to exclude.
 * @param {string[]} excludeFiles - Files to exclude.
 */
function overlayFiles(srcDir, destDir, excludeDirs = ["scripts", "penrose"], excludeFiles = ["tsconfig.json"]) {
    console.log(`Overlaying files from ${srcDir} to ${destDir}...`);
    fs.copySync(srcDir, destDir, {
        overwrite: true,
        filter: (src, dest) => {
            // Exclude specified files or directories
            return !excludeDirs.some((dir) => src.includes(dir)) && !excludeFiles.some((file) => path.basename(src) === file);
        },
    });
}

/**
 * Runs a command synchronously and handles errors gracefully.
 *
 * @param {string} command - The command to run.
 * @param {string[]} args - Arguments for the command.
 * @param {string} cwd - The working directory for the command.
 */
function runCommand(command, args, cwd = process.cwd()) {
    const result = spawnSync(command, args, { cwd, stdio: "inherit" });
    if (result.status !== 0) {
        const output = result.stderr?.toString() || result.stdout?.toString();
        exitWithError(`Error running command: ${command} ${args.join(" ")}\n${output}`);
    }
}

/**
 * Compiles TypeScript files using a given TypeScript configuration.
 *
 * @param {string} tsConfigPath - The path to the TypeScript configuration file.
 */
function compileTypeScript(tsConfigPath) {
    console.log(`Compiling TypeScript files using ${tsConfigPath}...`);
    const cwd = path.dirname(tsConfigPath); // Ensure cwd is the directory of the tsconfig
    runCommand("node", ["../node_modules/typescript/bin/tsc", "-p", tsConfigPath], cwd);
}

/**
 * Resolves TypeScript paths using tsc-alias.
 *
 * @param {string} tsConfigPath - The path to the TypeScript configuration file.
 */
function resolvePaths(tsConfigPath) {
    console.log("Resolving paths with tsc-alias...");
    const args = ["--resolve-full-paths", "--project", tsConfigPath];
    if (process.platform === "win32") {
        runCommand("cmd.exe", ["/c", TSC_ALIAS, ...args]);
    } else {
        runCommand(TSC_ALIAS, args);
    }
}

/**
 * Updates a distribution archive with the latest files using 7z.
 *
 * @param {string} archiveType - The type of archive (zip or mcpack).
 * @param {string} buildDir - The build directory.
 */
function updateArchive(archiveType, buildDir) {
    console.log(`Updating ${archiveType} archive...`);
    const archiveName = `Paradox-AntiCheat-v${packageJson.version}.${archiveType}`;
    const archivePath = path.join(buildDir, archiveName);
    const excludePatterns = ["build", "tsconfig.json"];
    const filesToAdd = fs.readdirSync(buildDir).filter((file) => !excludePatterns.includes(file));
    const sevenZipPath = path7za;

    const args = [
        "u",
        `-tzip`, // Use zip format for consistency
        archivePath,
        ...filesToAdd,
        `-x!${path.join(buildDir, "build")}`, // Exclude build directory itself
    ];

    console.log(`Running 7z with arguments: ${args.join(" ")}`);
    runCommand(sevenZipPath, args, buildDir);
}

/**
 * Main function orchestrating the build process.
 */
async function main() {
    const buildDir = ensureBuildDirectory();

    // Overlay files from personal directory
    overlayFiles(PERSONAL_DIR, buildDir);

    // Compile TypeScript
    const tsconfigPath = path.resolve(PERSONAL_DIR, "tsconfig.json");
    compileTypeScript(tsconfigPath);

    // Organize output files
    console.log("Organizing compiled files...");
    fs.copySync(`${buildDir}/scripts/pete9xi/scripts`, `${buildDir}/scripts`, { overwrite: true });
    fs.removeSync(`${buildDir}/scripts/pete9xi`);
    fs.removeSync(`${buildDir}/scripts/penrose`);

    // Resolve paths with tsc-alias
    resolvePaths(tsconfigPath);

    console.log("Build process completed successfully.");

    // Handle optional server and archive updates
    if (!process.argv.includes("--server")) {
        const archiveType = process.argv.includes("--mcpack") ? "mcpack" : "zip";
        updateArchive(archiveType, buildDir);
    }
}

// Execute the script
main();
