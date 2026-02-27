import path from "path";
import fs from "fs-extra";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { path7za } from "7zip-bin";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = "build";
const PERSONAL_DIR = "personal";

// ---------- Helper: run commands ----------
function runCommand(command, args, options = {}) {
    const result = spawnSync(command, args, { stdio: ["ignore", "inherit", "inherit"], ...options });
    if (result.error) {
        console.error(`Failed: ${command} ${args.join(" ")}\n`, result.error.message);
        process.exit(1);
    }
    if (result.status !== 0) process.exit(result.status);
}

// ---------- Helper: get 7za path ----------
function get7zaPath() {
    const platform = os.platform();
    if (platform === "win32") return path7za;
    const which7z = spawnSync("which", ["7z"]);
    if (which7z.status === 0) return "7z";
    const which7za = spawnSync("which", ["7za"]);
    if (which7za.status === 0) return "7za";
    try {
        fs.chmodSync(path7za, 0o755);
    } catch {}
    return path7za;
}

// ---------- Overlay personal files ----------
function overlayFiles(srcDir, destDir, excludeDirs = ["scripts", "penrose"], excludeFiles = ["tsconfig.json"]) {
    if (!fs.existsSync(srcDir)) return;
    console.log(`Overlaying personal files from ${srcDir}...`);
    fs.copySync(srcDir, destDir, {
        overwrite: true,
        filter: (src) => !excludeDirs.some((d) => src.includes(d)) && !excludeFiles.some((f) => path.basename(src) === f),
    });
}

// ---------- Compile TypeScript ----------
function compileTypeScript(tsConfigPath) {
    console.log(`Compiling TypeScript: ${tsConfigPath}`);
    const tsConfigDir = path.dirname(tsConfigPath);
    let tscPath = path.join(tsConfigDir, "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");
    if (!fs.existsSync(tscPath)) tscPath = path.join(__dirname, "..", "node_modules", ".bin", process.platform === "win32" ? "tsc.cmd" : "tsc");
    runCommand("node", [tscPath, "-p", tsConfigPath], tsConfigDir);
}

// ---------- Resolve paths ----------
function resolvePaths(tsConfigPath) {
    const tsConfigDir = path.dirname(tsConfigPath);
    let tscAlias = path.join(tsConfigDir, "node_modules", ".bin", process.platform === "win32" ? "tsc-alias.cmd" : "tsc-alias");
    if (!fs.existsSync(tscAlias)) tscAlias = path.join(__dirname, "..", "node_modules", ".bin", process.platform === "win32" ? "tsc-alias.cmd" : "tsc-alias");
    console.log("Resolving paths with tsc-alias...");
    const args = ["--resolve-full-paths", "--project", tsConfigPath];
    if (process.platform === "win32") runCommand("cmd.exe", ["/c", tscAlias, ...args], tsConfigDir);
    else runCommand(tscAlias, args, tsConfigDir);
}

// ---------- Create archive ----------
function createArchive(fileName, manifestModifier = null) {
    const filePath = path.resolve(BUILD_DIR, fileName);
    const sevenZip = get7zaPath();

    const manifestPath = path.join(BUILD_DIR, "manifest.json");
    if (manifestModifier && fs.existsSync(manifestPath)) {
        const manifest = fs.readJsonSync(manifestPath);
        manifestModifier(manifest);
        fs.writeJsonSync(manifestPath, manifest, { spaces: 2 });
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    const files = ["CHANGELOG.md", "LICENSE", "README.md", "manifest.json", "pack_icon.png", "scripts/*"];
    console.log(`Creating archive: ${fileName}`);
    runCommand(sevenZip, ["a", "-tzip", "-y", filePath, ...files], { cwd: BUILD_DIR });
    console.log(`Archive created: ${fileName}`);
}

// ---------- Main build ----------
async function main() {
    const isPersonal = process.argv.includes("--personal");
    const isMcpack = process.argv.includes("--mcpack");

    // Sync version
    console.log("\nSyncing version...");
    runCommand("node", ["./bin/version-sync.js"]);

    const packageJson = fs.readJsonSync("package.json");
    const version = packageJson.version;

    // Clean & prepare build
    fs.removeSync(BUILD_DIR);
    fs.mkdirSync(BUILD_DIR, { recursive: true });

    // Copy core assets & bundle scripts
    ["CHANGELOG.md", "LICENSE", "manifest.json", "pack_icon.png", "README.md"].forEach((f) => {
        fs.copyFileSync(f, path.join(BUILD_DIR, f));
    });
    console.log("Running esbuild...");
    runCommand("node", ["./bin/esbuild.js"]);

    // Compile standard TypeScript first
    compileTypeScript(path.resolve("./tsconfig.json"));
    resolvePaths(path.resolve("./tsconfig.json"));

    // ---------- Apply personal overlay if requested ----------
    if (isPersonal) {
        console.log("Applying personal updates...");
        overlayFiles(PERSONAL_DIR, BUILD_DIR);

        const personalTsConfig = path.resolve(PERSONAL_DIR, "tsconfig.json");
        compileTypeScript(personalTsConfig);
        resolvePaths(personalTsConfig);

        // Organize personal scripts
        const scriptsDir = path.join(BUILD_DIR, "scripts");
        if (fs.existsSync(path.join(scriptsDir, "personal", "scripts"))) {
            fs.copySync(path.join(scriptsDir, "personal", "scripts"), scriptsDir, { overwrite: true });
        }
        fs.removeSync(path.join(scriptsDir, "personal"));
        fs.removeSync(path.join(scriptsDir, "penrose"));
    }

    console.log("Build completed successfully.");

    // Create archives
    createArchive(`Paradox-AntiCheat-v${version}-BDS.zip`);
    if (isMcpack) {
        createArchive(`Paradox-AntiCheat-v${version}-REALMS.mcpack`, (manifest) => {
            manifest.dependencies = manifest.dependencies?.filter((d) => d.module_name !== "@minecraft/server-net") || [];
        });
    }

    console.log("All done!");
}

main();
