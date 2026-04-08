import path from "path";
import fs from "fs-extra";
import { spawnSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import pkg from "7zip-bin-full";
import os from "os";
import { glob } from "glob";
const { path7z } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = "build";
const TSC_ALIAS = path.join("./node_modules", ".bin", "tsc-alias");

// ---------------- Flags ----------------
const wantMcpack = process.argv.includes("--mcpack");
const wantZip = process.argv.includes("--zip");
const skipArchive = process.argv.includes("--server");

// ---------------- Utilities ----------------
function exitWithError(message) {
    console.error(message);
    process.exit(1);
}

function run(command, args, options = {}) {
    const result = spawnSync(command, args, { stdio: "inherit", ...options });
    if (result.status !== 0) {
        exitWithError(`Command failed: ${command} ${args.join(" ")}`);
    }
}

function cleanBuildDir() {
    fs.removeSync(BUILD_DIR);
    fs.mkdirSync(BUILD_DIR, { recursive: true });
}

function get7zaPath() {
    // If user wants system 7z
    if (process.env.USE_SYSTEM_7Z) {
        console.log("Using system 7z from PATH...");
        return "7z";
    }

    // Otherwise use bundled binary
    try {
        fs.chmodSync(path7z, 0o755); // ensure executable on unix
    } catch {}

    return path7z;
}

function getArchiveTypes() {
    const types = [];
    if (skipArchive) return []; // skip all
    if (wantMcpack) types.push("mcpack");
    if (wantZip) types.push("zip");
    if (!wantMcpack && !wantZip) types.push("zip"); // default
    return types;
}

// ---------------- Version Sync ----------------
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
function compile(tsconfigPath) {
    console.log(`Compiling TypeScript: ${tsconfigPath}`);
    run("npx", ["tsc", "-p", tsconfigPath], { cwd: process.cwd() });
}

function resolveAliases(tsconfigPath) {
    console.log("Resolving TypeScript paths...");
    const args = ["--resolve-full-paths", "--project", tsconfigPath];
    run(`./${TSC_ALIAS}`, args);
}

function createArchive(type = "zip") {
    const packageJson = fs.readJsonSync("package.json");
    const archiveName = type === "mcpack" ? `Paradox-AntiCheat-v${packageJson.version}-REALMS.mcpack` : `Paradox-AntiCheat-v${packageJson.version}-BDS.zip`;

    const outputFilePath = path.join(BUILD_DIR, archiveName);
    if (fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);

    // Modify manifest.json for mcpack
    const manifestPath = path.join(BUILD_DIR, "manifest.json");
    if (type === "mcpack" && fs.existsSync(manifestPath)) {
        console.log("Modifying manifest.json for Realms build...");
        const manifest = fs.readJsonSync(manifestPath);
        if (manifest.dependencies) {
            manifest.dependencies = manifest.dependencies.filter((dep) => dep.module_name !== "@minecraft/server-net");
            fs.writeJsonSync(manifestPath, manifest, { spaces: 2 });
        }
    }

    console.log(`Creating archive: ${archiveName}`);
    run(get7zaPath(), ["a", "-tzip", archiveName, "-xr!*.d.ts", "-xr!*.d.ts.map", "CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png", "scripts"], { cwd: BUILD_DIR });
    console.log(`Archive created successfully: ${outputFilePath}`);
}

// ---------------- Server/Test Mode ----------------
async function runServerTest() {
    console.log("> Running build in server/test mode...");

    // Find bedrock server directory
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

    // Run BDS server
    const serverPath = path.resolve(bedrockServerDir, "bedrock_server");
    const osType = os.type();

    if (osType === "Linux") {
        fs.chmodSync(serverPath, 0o755);
        const serverProcess = spawn("sh", ["-c", `sudo LD_LIBRARY_PATH=. ${serverPath}`], {
            stdio: "inherit",
            cwd: bedrockServerDir,
        });
        serverProcess.on("exit", (code) => {
            console.log(`\nServer exited with code ${code}.`);
            process.exit(code);
        });
    } else {
        exitWithError("> Unsupported OS for server test: " + osType);
    }
}

// ---------------- Main ----------------
async function main() {
    syncVersion();

    console.log(`Starting build | mcpack=${wantMcpack} | zip=${wantZip}\n`);

    cleanBuildDir();

    // Copy static files
    ["CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png"].forEach((file) => fs.copyFileSync(file, path.join(BUILD_DIR, file)));

    // Regular build
    console.log("Running regular build...");
    run("node", ["./bin/esbuild.js"]);

    // Compile penrose first
    compile("./tsconfig.json");

    // Final alias resolution for penrose imports
    resolveAliases("./tsconfig.json");

    console.log("\nBuild finished successfully.\n");

    // Create archives if not in --server mode
    const archiveTypes = getArchiveTypes();
    for (const type of archiveTypes) createArchive(type);

    if (skipArchive) await runServerTest();
}

main();
