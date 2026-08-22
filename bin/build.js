import path from "path";
import fs from "fs-extra";
import { spawnSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import pkg from "7zip-bin-full";
import os from "os";
import { glob } from "glob";
import { obfuscateBundle } from "./obfuscate.js";

const { path7z } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = "build";
const TSC_ALIAS = path.join("./node_modules", ".bin", process.platform === "win32" ? "tsc-alias.cmd" : "tsc-alias");

// ---------------- Flags ----------------
const wantMcpack = process.argv.includes("--mcpack");
const wantZip = process.argv.includes("--zip");
const skipArchive = process.argv.includes("--server");

// ---------------- Utilities ----------------

/**
 * Logs an error message and terminates the process with exit code 1.
 *
 * @param {string} message - Error description to display in the console.
 */
function exitWithError(message) {
    console.error(message);
    process.exit(1);
}

/**
 * Encloses argument strings in quotes if running on Windows and spaces are present.
 *
 * @param {string} arg - The command argument string.
 * @returns {string} The escaped or original argument string.
 */
function quoteWinArg(arg) {
    if (/[\s"]/g.test(arg)) {
        return `"${arg.replace(/"/g, '\\"')}"`;
    }
    return arg;
}

/**
 * Synchronously executes a command line binary or process.
 *
 * @param {string} command - Binary executable path or name.
 * @param {string[]} args - List of arguments supplied to the binary.
 * @param {import("child_process").SpawnSyncOptions} [options={}] - Additional spawn configurations.
 */
function run(command, args, options = {}) {
    const isWin = process.platform === "win32";

    const cmdString = isWin ? [command, ...args.map(quoteWinArg)].join(" ") : command;

    const result = spawnSync(cmdString, isWin ? [] : args, {
        stdio: "pipe",
        encoding: "utf-8",
        shell: isWin,
        ...options,
    });

    if (result.status !== 0) {
        console.error(`\n❌ [BUILD ERROR] Standard Error Output:`);
        if (result.stderr) console.error(result.stderr);
        if (result.stdout) console.log(result.stdout);
        if (result.error) console.error(result.error.message);
        console.error(`❌ ---------------------------------------\n`);
        exitWithError(`Command failed: ${command} ${args.join(" ")}`);
    }
}

/**
 * Wipes the existing build folder and recreates an empty directory.
 */
function cleanBuildDir() {
    fs.removeSync(BUILD_DIR);
    fs.mkdirSync(BUILD_DIR, { recursive: true });
}

/**
 * Resolves the executable path for 7-Zip depending on environment variables.
 *
 * @returns {string} Path or command alias to execute 7-Zip.
 */
function get7zaPath() {
    if (process.env.USE_SYSTEM_7Z) {
        console.log("Using system 7z from PATH...");
        return "7z";
    }

    try {
        fs.chmodSync(path7z, 0o755);
    } catch {}

    return path7z;
}

/**
 * Calculates which archive types should be created based on CLI flags.
 *
 * @returns {Array<"mcpack" | "zip">} List of output archive formats.
 */
function getArchiveTypes() {
    const types = [];
    if (skipArchive) return [];
    if (wantMcpack) types.push("mcpack");
    if (wantZip) types.push("zip");
    if (!wantMcpack && !wantZip) types.push("zip");
    return types;
}

// ---------------- Version Sync ----------------

/**
 * Validates that package.json version matches the exported constant in versioning.ts.
 */
function syncVersion() {
    console.log("\nSyncing version with versioning.ts...");
    const packageJson = fs.readJsonSync("package.json");
    const expected = "v" + packageJson.version;
    const versioningFile = fs.readFileSync(path.resolve("./penrose/data/versioning.ts"), "utf8");
    const match = versioningFile.match(/export const paradoxVersion = "(v\d+\.\d+\.\d+)";/);
    if (!match) exitWithError("Version pattern not found in versioning.ts");
    if (match[1] !== expected) exitWithError(`Version mismatch: package.json (${expected}) vs versioning.ts (${match[1]})`);
    console.log("Version is synced!\n");
}

// ---------------- Build Steps ----------------

/**
 * Compresses build assets into a .zip or .mcpack archive using 7-Zip.
 *
 * @param {"zip" | "mcpack"} [type="zip"] - Target archive file type.
 */
async function createArchive(type = "zip") {
    const packageJson = fs.readJsonSync("package.json");
    const archiveName = type === "mcpack" ? `Paradox-AntiCheat-v${packageJson.version}-REALMS.mcpack` : `Paradox-AntiCheat-v${packageJson.version}-BDS.zip`;

    const outputFilePath = path.join(BUILD_DIR, archiveName);
    if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

    const manifest = fs.readJsonSync("manifest.json");
    const manifestPath = path.join(BUILD_DIR, "manifest.json");

    if (type === "mcpack") {
        console.log("Modifying manifest.json for Realms build...");
        if (manifest.dependencies) {
            manifest.dependencies = manifest.dependencies.filter((dep) => dep.module_name !== "@minecraft/server-net" && dep.module_name !== "@minecraft/server-admin" && dep.module_name !== "@minecraft/debug-utilities");
        }
    }
    fs.writeJsonSync(manifestPath, manifest, { spaces: 2 });

    // 1. Re-compile clean paradox.js from TypeScript
    console.log(`Running esbuild for [${type.toUpperCase()}] target...`);
    run("node", ["./bin/esbuild.js"]);

    // 2. Generate target-specific imports in paradox.js loader
    await obfuscateBundle(type === "mcpack");

    console.log(`Creating archive: ${archiveName}`);

    const archiveArgs = ["a", "-tzip", archiveName, "-xr!*.d.ts", "-xr!*.d.ts.map", "CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png", "scripts"];

    run(get7zaPath(), archiveArgs, { cwd: BUILD_DIR });
    console.log(`Archive created successfully: ${outputFilePath}`);
}

// ---------------- Server/Test Mode ----------------

/**
 * Prepares a Bedrock Dedicated Server environment and deploys the build folder to run test passes.
 *
 * @returns {Promise<void>}
 */
async function runServerTest() {
    console.log("> Running build in server/test mode...");

    let bedrockDirs = glob.sync("bedrock-server-*");
    let bedrockServerDir = bedrockDirs[0];

    if (!bedrockServerDir) {
        console.log("> Bedrock server directory not found. Running BDS setup script...");
        const bdsProcess = spawn("node", ["bin/bds.js"], { stdio: "inherit" });
        await new Promise((resolve, reject) => {
            bdsProcess.on("close", (code) => {
                if (code === 0) {
                    const dirs = glob.sync("bedrock-server-*");
                    bedrockServerDir = dirs[0];
                    if (!bedrockServerDir) return reject("BDS setup did not create a server folder.");
                    resolve();
                } else reject(`BDS setup failed with code ${code}`);
            });
        });
    }

    bedrockServerDir = bedrockServerDir.replace(/\.zip$/, "");

    const worldsDir = path.join(bedrockServerDir, "worlds");
    if (!fs.existsSync(worldsDir)) fs.mkdirSync(worldsDir, { recursive: true });

    const testWorldDir = path.join(worldsDir, "Bedrock level");
    if (!fs.existsSync(testWorldDir)) {
        fs.mkdirSync(testWorldDir);
        fs.copySync("new-world-beta-api", testWorldDir);
    }

    const paradoxDir = path.join(testWorldDir, "behavior_packs", "paradox");
    if (fs.existsSync(paradoxDir)) fs.removeSync(paradoxDir);
    fs.mkdirSync(paradoxDir, { recursive: true });

    console.log("> Copying build contents to paradox folder...");
    fs.copySync(BUILD_DIR, paradoxDir);

    const manifestPath = path.join(paradoxDir, "manifest.json");
    if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        const worldBehaviorPacksPath = path.join(testWorldDir, "world_behavior_packs.json");
        if (fs.existsSync(worldBehaviorPacksPath)) {
            fs.writeFileSync(worldBehaviorPacksPath, JSON.stringify([{ pack_id: manifest.header.uuid, version: manifest.header.version }], null, 2));
        }
    }

    const serverPath = path.resolve(bedrockServerDir, "bedrock_server");
    const osType = os.type();

    if (osType === "Linux") {
        fs.chmodSync(serverPath, 0o755);
        const useSudo = process.env.USE_SUDO === "true";
        const serverProcess = spawn("sh", ["-c", `${useSudo ? "sudo " : ""}LD_LIBRARY_PATH=. ${serverPath}`], {
            stdio: "inherit",
            cwd: bedrockServerDir,
        });
        serverProcess.on("exit", (code) => {
            console.log(`\nServer exited with code ${code}.`);
            process.exit(code);
        });
    } else if (osType === "Windows_NT") {
        const serverProcess = spawn("cmd", ["/c", serverPath], { stdio: "inherit", cwd: bedrockServerDir });
        serverProcess.on("exit", (code) => {
            console.log(`\nServer exited with code ${code}.`);
            process.exit(code);
        });
    } else {
        exitWithError("> Unsupported OS for server test: " + osType);
    }
}

// ---------------- Main ----------------

/**
 * Entry point for orchestration pipeline.
 *
 * @returns {Promise<void>}
 */
async function main() {
    syncVersion();

    console.log(`Starting build | mcpack=${wantMcpack} | zip=${wantZip}\n`);

    cleanBuildDir();

    // Copy static files
    ["CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png"].forEach((file) => fs.copyFileSync(file, path.join(BUILD_DIR, file)));

    // Create archives if not in --server mode
    const archiveTypes = getArchiveTypes();
    for (const type of archiveTypes) {
        await createArchive(type);
    }

    if (skipArchive) {
        console.log("Running esbuild bundler for server test mode...");
        run("node", ["./bin/esbuild.js"]);
        await obfuscateBundle(false); // Generate full BDS loader
        await runServerTest();
    }
}

main();
