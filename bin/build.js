import path from "path";
import fs from "fs-extra";
import { spawnSync, spawn } from "child_process";
import { fileURLToPath } from "url";
import pkg from "7zip-bin-full";
import os from "os";
import { glob } from "glob";

// Direct async imports to prevent duplicate execution loops
import { buildBundle } from "./esbuild.js";
import { obfuscateBundle } from "./obfuscate.js";

const { path7z } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = "build";

// ---------------- Flags ----------------
const wantMcpack = process.argv.includes("--mcpack");
const wantZip = process.argv.includes("--zip");
const skipArchive = process.argv.includes("--server");

// ---------------- Utilities ----------------

function exitWithError(message) {
    console.error(message);
    process.exit(1);
}

function quoteWinArg(arg) {
    if (/[\s"]/g.test(arg)) {
        return `"${arg.replace(/"/g, '\\"')}"`;
    }
    return arg;
}

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

function cleanBuildDir() {
    fs.removeSync(BUILD_DIR);
    fs.mkdirSync(BUILD_DIR, { recursive: true });
}

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
 * Packs existing build directory files into a .zip or .mcpack archive without re-obfuscating.
 *
 * @param {"zip" | "mcpack"} type - Target archive file format.
 */
async function createArchive(type) {
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

    console.log(`Creating archive: ${archiveName}`);
    const archiveArgs = ["a", "-tzip", archiveName, "-xr!*.d.ts", "-xr!*.d.ts.map", "CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png", "scripts"];

    run(get7zaPath(), archiveArgs, { cwd: BUILD_DIR });
    console.log(`Archive created successfully: ${outputFilePath}`);
}

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

async function main() {
    syncVersion();

    console.log(`Starting build pipeline | mcpack=${wantMcpack} | zip=${wantZip} | server=${skipArchive}\n`);

    cleanBuildDir();

    // 1. Copy root static files
    ["CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png"].forEach((file) => fs.copyFileSync(file, path.join(BUILD_DIR, file)));

    // 2. Single-pass compilation and obfuscation
    console.log("[Build] Executing single-pass esbuild compilation...");
    await buildBundle();

    console.log("[Build] Executing single-pass obfuscator...");
    await obfuscateBundle();

    // 3. Output target archives
    if (wantZip) {
        await createArchive("zip");
    }

    if (wantMcpack) {
        await createArchive("mcpack");
    }

    // 4. Launch Bedrock server test if requested
    if (skipArchive) {
        await runServerTest();
    }
}

main();
