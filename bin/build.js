import path from "path";
import fs from "fs-extra";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { path7za } from "7zip-bin";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = "build";
const PERSONAL_DIR = "personal";
const TSC_ALIAS = path.join("node_modules", ".bin", process.platform === "win32" ? "tsc-alias.cmd" : "tsc-alias");

// ---------------- Flags ----------------
const isPersonal = process.argv.includes("--personal");
const wantMcpack = process.argv.includes("--mcpack");
const wantZip = process.argv.includes("--zip");
const skipArchive = process.argv.includes("--server");

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

    if (!match) {
        console.error("Version pattern not found in versioning.ts");
        process.exit(1);
    }

    if (match[1] !== expected) {
        console.error(`Version mismatch: package.json (${expected}) vs versioning.ts (${match[1]})`);
        process.exit(1);
    }

    console.log("Version is synced!\n");
}

// ---------------- Utilities ----------------
function exitWithError(message) {
    console.error(message);
    process.exit(1);
}

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        stdio: "inherit",
        ...options,
    });

    if (result.status !== 0) {
        exitWithError(`Command failed: ${command} ${args.join(" ")}`);
    }
}

function cleanBuildDir() {
    fs.removeSync(BUILD_DIR);
    fs.mkdirSync(BUILD_DIR, { recursive: true });
}

function get7zaPath() {
    const platform = os.platform();

    if (platform === "win32") return path7za;

    if (platform === "linux") {
        if (spawnSync("which", ["7z"]).status === 0) return "7z";
        if (spawnSync("which", ["7za"]).status === 0) return "7za";
        try {
            fs.chmodSync(path7za, 0o755);
        } catch {}
        return path7za;
    }

    throw new Error(`Unsupported platform: ${platform}`);
}

// ---------------- Build Steps ----------------

function compile(tsconfigPath) {
    console.log(`Compiling TypeScript: ${tsconfigPath}`);
    run(process.platform === "win32" ? "npx.cmd" : "npx", ["tsc", "-p", tsconfigPath], { cwd: process.cwd() });
}

function resolveAliases(tsconfigPath) {
    console.log("Resolving TypeScript paths...");

    const args = ["--resolve-full-paths", "--project", tsconfigPath];

    if (process.platform === "win32") {
        run("cmd.exe", ["/c", TSC_ALIAS, ...args]);
    } else {
        run(`./${TSC_ALIAS}`, args);
    }
}

function overlayPersonalRoot() {
    console.log("Overlaying personal root files...");

    fs.copySync(PERSONAL_DIR, BUILD_DIR, {
        overwrite: true,
        filter: (src) => {
            const excludedDirs = ["scripts", "penrose"];
            const excludedFiles = ["tsconfig.json"];
            return !excludedDirs.some((dir) => src.includes(dir)) && !excludedFiles.includes(path.basename(src));
        },
    });
}

function flattenPersonalScripts() {
    const nested = path.join(BUILD_DIR, "scripts", "personal", "scripts");
    const target = path.join(BUILD_DIR, "scripts");

    if (!fs.existsSync(nested)) {
        exitWithError("Personal build failed: expected nested scripts directory not found.");
    }

    console.log("Flattening personal scripts...");
    fs.copySync(nested, target, { overwrite: true });

    fs.removeSync(path.join(BUILD_DIR, "scripts", "personal"));
    fs.removeSync(path.join(BUILD_DIR, "scripts", "penrose"));
}

function createArchive(type = "zip") {
    const packageJson = fs.readJsonSync("package.json");

    const archiveName = type === "mcpack" ? `Paradox-AntiCheat-v${packageJson.version}-REALMS.mcpack` : `Paradox-AntiCheat-v${packageJson.version}-BDS.zip`;

    const outputFilePath = path.join(BUILD_DIR, archiveName);

    if (fs.existsSync(outputFilePath)) {
        fs.unlinkSync(outputFilePath);
    }

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

    run(get7zaPath(), ["a", "-tzip", archiveName, "CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png", "scripts"], { cwd: BUILD_DIR });

    console.log(`Archive created successfully: ${outputFilePath}`);
}

// ---------------- Main ----------------

async function main() {
    syncVersion();

    console.log(`Starting build | personal=${isPersonal} | mcpack=${wantMcpack} | zip=${wantZip}\n`);

    cleanBuildDir();

    // Copy static files
    ["CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png"].forEach((file) => fs.copyFileSync(file, path.join(BUILD_DIR, file)));

    // Regular build
    console.log("Running regular build...");
    run("node", ["./bin/esbuild.js"]);
    compile("./tsconfig.json");

    // Personal overlay
    if (isPersonal) {
        console.log("\nApplying personal layer...\n");
        compile(`./${PERSONAL_DIR}/tsconfig.json`);
        overlayPersonalRoot();
        flattenPersonalScripts();
    }

    resolveAliases("./tsconfig.json");

    console.log("\nBuild finished successfully.\n");

    // Create archives
    const archiveTypes = getArchiveTypes();
    for (const type of archiveTypes) {
        createArchive(type);
    }

    if (archiveTypes.length === 0) {
        console.log("Skipping archive creation (--server).");
    }
}

main();
