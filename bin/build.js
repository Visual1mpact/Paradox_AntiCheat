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
const BUILD_DIR = "build";

// Flags
const wantMcpack = process.argv.includes("--mcpack");
const wantZip = process.argv.includes("--zip");
const skipArchive = process.argv.includes("--server");

/**
 * Logs an error message and terminates the process with exit code 1.
 *
 * @param {string} message - Error message to print.
 * @returns {never}
 */
function exitWithError(message) {
    console.error(message);
    process.exit(1);
}

/**
 * Escapes quotes in Windows arguments.
 *
 * @param {string} arg - Argument string.
 * @returns {string} Formatted argument string.
 */
function quoteWinArg(arg) {
    return /[\s"]/g.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

/**
 * Runs a command synchronously.
 *
 * @param {string} command - Binary or script command.
 * @param {string[]} args - Command arguments.
 * @param {object} [options={}] - Options object.
 * @returns {void}
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
 * Ensures build directory clean state.
 *
 * @returns {Promise<void>}
 */
async function cleanBuildDir() {
    await fs.remove(BUILD_DIR);
    await fs.mkdir(BUILD_DIR, { recursive: true });
}

/**
 * Resolves 7-Zip executable path.
 *
 * @returns {string} Resolved 7z binary location.
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
 * Synchronizes and validates package versioning.
 *
 * @returns {Promise<void>}
 */
async function syncVersion() {
    console.log("\nSyncing version with versioning.ts...");
    const packageJson = await fs.readJson("package.json");
    const expected = `v${packageJson.version}`;
    const versioningFile = await fs.readFile(path.resolve("./penrose/versioning.ts"), "utf8");
    const match = versioningFile.match(/export const paradoxVersion = "(v\d+\.\d+\.\d+)";/);

    if (!match) exitWithError("Version pattern not found in versioning.ts");
    if (match[1] !== expected) exitWithError(`Version mismatch: package.json (${expected}) vs versioning.ts (${match[1]})`);

    console.log("Version is synced!\n");
}

/**
 * Prepares manifest for targeted build package.
 *
 * @param {"zip" | "mcpack"} type - Archive type.
 * @returns {Promise<string>} Archive file path.
 */
async function prepareManifest(type) {
    const packageJson = await fs.readJson("package.json");
    const archiveName = type === "mcpack" ? `Paradox-AntiCheat-v${packageJson.version}-REALMS.mcpack` : `Paradox-AntiCheat-v${packageJson.version}-BDS.zip`;

    const manifestPath = path.join(BUILD_DIR, "manifest.json");
    const manifest = await fs.readJson("manifest.json");

    if (type === "mcpack" && manifest.dependencies) {
        manifest.dependencies = manifest.dependencies.filter((dep) => !["@minecraft/server-net", "@minecraft/server-admin", "@minecraft/debug-utilities"].includes(dep.module_name));
    }
    await fs.writeJson(manifestPath, manifest, { spaces: 2 });
    return archiveName;
}

/**
 * Packs build files into an output archive.
 *
 * @param {"zip" | "mcpack"} type - Output format.
 * @returns {Promise<void>}
 */
async function createArchive(type) {
    const archiveName = await prepareManifest(type);
    const outputFilePath = path.join(BUILD_DIR, archiveName);

    if (await fs.pathExists(outputFilePath)) {
        await fs.unlink(outputFilePath);
    }

    console.log(`Creating archive: ${archiveName}`);
    const archiveArgs = ["a", "-tzip", archiveName, "-xr!*.d.ts", "-xr!*.d.ts.map", "CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png", "scripts"];

    run(get7zaPath(), archiveArgs, { cwd: BUILD_DIR });
    console.log(`Archive created successfully: ${outputFilePath}`);
}

/**
 * Helper to spawn process and wait for completion.
 *
 * @param {string} cmd - Command executable.
 * @param {string[]} args - Command arguments.
 * @param {object} options - Spawn options.
 * @returns {Promise<number>} Exit code.
 */
function spawnChild(cmd, args, options) {
    return new Promise((resolve, reject) => {
        const child = spawn(cmd, args, options);
        child.on("exit", resolve);
        child.on("error", reject);
    });
}

/**
 * Configures world environment for server test runs.
 *
 * @returns {Promise<string>} Path to server directory.
 */
async function setupServerEnvironment() {
    let bedrockDirs = glob.sync("bedrock-server-*");
    let bedrockServerDir = bedrockDirs[0];

    if (!bedrockServerDir) {
        console.log("> Running BDS setup script...");
        const code = await spawnChild("node", ["bin/bds.js"], { stdio: "inherit" });
        if (code !== 0) throw new Error(`BDS setup failed with code ${code}`);
        bedrockServerDir = glob.sync("bedrock-server-*")[0];
        if (!bedrockServerDir) throw new Error("BDS setup did not create a server folder.");
    }

    bedrockServerDir = bedrockServerDir.replace(/\.zip$/, "");
    const testWorldDir = path.join(bedrockServerDir, "worlds", "Bedrock level");

    await fs.ensureDir(testWorldDir);
    if (!(await fs.pathExists(path.join(testWorldDir, "level.dat")))) {
        await fs.copy("new-world-beta-api", testWorldDir);
    }

    const paradoxDir = path.join(testWorldDir, "behavior_packs", "paradox");
    await fs.remove(paradoxDir);
    await fs.copy(BUILD_DIR, paradoxDir);

    const manifestPath = path.join(paradoxDir, "manifest.json");
    if (await fs.pathExists(manifestPath)) {
        const manifest = await fs.readJson(manifestPath);
        const worldPacksPath = path.join(testWorldDir, "world_behavior_packs.json");
        await fs.writeJson(worldPacksPath, [{ pack_id: manifest.header.uuid, version: manifest.header.version }], { spaces: 2 });
    }

    return bedrockServerDir;
}

/**
 * Runs server integration tests.
 *
 * @returns {Promise<void>}
 */
async function runServerTest() {
    console.log("> Running build in server/test mode...");
    const bedrockServerDir = await setupServerEnvironment();
    const serverPath = path.resolve(bedrockServerDir, "bedrock_server");
    const osType = os.type();

    let cmd = "sh";
    let args = ["-c", `${process.env.USE_SUDO === "true" ? "sudo " : ""}LD_LIBRARY_PATH=. ${serverPath}`];

    if (osType === "Linux") {
        await fs.chmod(serverPath, 0o755);
    } else if (osType === "Windows_NT") {
        cmd = "cmd";
        args = ["/c", serverPath];
    } else {
        exitWithError(`> Unsupported OS for server test: ${osType}`);
    }

    const code = await spawnChild(cmd, args, { stdio: "inherit", cwd: bedrockServerDir });
    console.log(`\nServer exited with code ${code}.`);
    process.exit(code);
}

/**
 * Main build process orchestrator.
 *
 * @returns {Promise<void>}
 */
async function main() {
    await syncVersion();
    console.log(`Starting build pipeline | mcpack=${wantMcpack} | zip=${wantZip} | server=${skipArchive}\n`);

    console.log("[Build] Running strict TypeScript type check...");
    run("npx", ["tsc", "--noEmit"]);
    console.log("[Build] Type check passed successfully!\n");

    await cleanBuildDir();

    const staticFiles = ["CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png"];
    await Promise.all(staticFiles.map((file) => fs.copy(file, path.join(BUILD_DIR, file))));

    console.log("[Build] Executing single-pass esbuild compilation...");
    await buildBundle();

    console.log("[Build] Executing single-pass obfuscator...");
    await obfuscateBundle();

    if (wantZip) await createArchive("zip");
    if (wantMcpack) await createArchive("mcpack");
    if (skipArchive) await runServerTest();
}

main();
