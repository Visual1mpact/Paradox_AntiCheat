import fs from "fs";
import path from "path";
import { promisify } from "util";
import { spawn, spawnSync } from "child_process";
import os from "os";
import fse from "fs-extra";
import { glob } from "glob";
import { fileURLToPath } from "url";

const exec = promisify((await import("child_process")).exec);

// Constants
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Execute version-sync.js to ensure versions are synchronized
console.log("\nSyncing version with version-sync.js...");
const versionSyncResult = spawnSync("node", ["./bin/version-sync.js"], { stdio: "inherit" });

if (versionSyncResult.status !== 0) {
    console.error("Version synchronization failed.");
    process.exit(1); // Exit with error code if version sync fails
}

// Array to store all spawned child processes
const spawnedProcesses = [];

// Function to get the latest "bedrock-server-*" directory
function getLatestBedrockServerDir() {
    return glob.sync("bedrock-server-*")[0];
}

async function checkAndBuild() {
    // Clean up the 'build/' directory
    const cleanBuildDir = "build";
    if (fs.existsSync(cleanBuildDir)) {
        fse.removeSync(cleanBuildDir);
        console.log("> Cleaned up the 'build/' directory...\n");
    }

    // Use the function to get the latest directory
    let bedrockServerDir = getLatestBedrockServerDir();

    if (!bedrockServerDir) {
        console.error("> Bedrock server directory not found...\n");
        // Execute your BDS script here
        const bdsProcess = spawn("node", ["bds.js"], {
            stdio: "inherit",
        });
        spawnedProcesses.push(bdsProcess); // Add to the array

        await new Promise((resolve) => {
            bdsProcess.on("close", (code) => {
                if (code === 0) {
                    bedrockServerDir = glob.sync("bedrock-server-*")[0];
                    console.log("\n> Bedrock server set up successfully...\n");
                    resolve();
                } else {
                    console.error("   - Error while setting up the Bedrock server.");
                    process.exit(code);
                }
            });
        });
    }

    if (bedrockServerDir) {
        // Remove the ".zip" extension from the directory name if it exists
        bedrockServerDir = bedrockServerDir.replace(/\.zip$/, "");
    } else {
        console.error("> Bedrock server directory not found...\n");
        return;
    }

    // Check if the 'worlds' folder exists, and if not, create it
    const worldsDir = path.join(bedrockServerDir, "worlds");
    if (!fs.existsSync(worldsDir)) {
        fs.mkdirSync(worldsDir, { recursive: true });
    }

    // Check if the 'Bedrock level' subfolder exists in 'worlds'
    const testWorldDir = path.join(worldsDir, "Bedrock level");
    if (!fs.existsSync(testWorldDir)) {
        fs.mkdirSync(testWorldDir); // Create the 'Bedrock level' subfolder
        fse.copySync("new-world-beta-api", testWorldDir); // Copy 'new-world-beta-api' to the 'Bedrock level' subfolder
    }

    // Define the paradox directory
    const paradoxDir = path.join(testWorldDir, "behavior_packs", "paradox");

    // Clean up the 'paradox' directory if it exists
    if (fs.existsSync(paradoxDir)) {
        fse.removeSync(paradoxDir);
        console.log(`> Cleaned up the '${paradoxDir}' directory...\n`);
    }

    // Create the paradox directory again
    fs.mkdirSync(paradoxDir, { recursive: true });

    // Check if --personal parameter is present
    const isServerModePersonal = process.argv.includes("--personal");

    // Determine the commands to execute
    const firstCommand = "node bin/build-package.js --server";
    const secondCommand = "node bin/personal-build-package.js --server";

    // Determine the OS type and execute the appropriate build commands sequentially
    try {
        if (os.type() === "Linux") {
            await exec(firstCommand);
            if (isServerModePersonal) {
                await exec(secondCommand);
            }
        } else if (os.type() === "Windows_NT") {
            await exec(firstCommand);
            if (isServerModePersonal) {
                await exec(secondCommand);
            }
        } else {
            console.error("Unsupported OS: " + os.type());
        }
        console.log("Build process completed successfully.");
    } catch (error) {
        console.error("Error executing the command:", error.message);
    }

    // Copy the build contents to the 'paradox' directory
    const buildDir = "build";
    fse.copySync(buildDir, paradoxDir);

    console.log(`> Copied build contents to '${paradoxDir}'...\n`);

    // Read and parse manifest.json
    const manifestPath = path.join(paradoxDir, "manifest.json");
    if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

        // Update world_behavior_packs.json
        const worldBehaviorPacksPath = path.join(testWorldDir, "world_behavior_packs.json");
        if (fs.existsSync(worldBehaviorPacksPath)) {
            const worldBehaviorPacks = [
                {
                    pack_id: manifest.header.uuid,
                    version: manifest.header.version,
                },
            ];

            fs.writeFileSync(worldBehaviorPacksPath, JSON.stringify(worldBehaviorPacks, null, 2));
        }
    }

    console.log("> Test build completed...\n");

    const serverPath = path.resolve(bedrockServerDir, "bedrock_server");

    if (os.type() === "Linux") {
        const sudoCommand = `LD_LIBRARY_PATH=. ${serverPath}`;
        const chmodProcess = spawn("chmod", ["+x", serverPath], { cwd: bedrockServerDir });

        chmodProcess.on("close", (chmodCode) => {
            if (chmodCode === 0) {
                const serverProcess = spawn("sh", ["-c", `sudo ${sudoCommand}`], {
                    stdio: "inherit",
                    cwd: bedrockServerDir,
                });
                spawnedProcesses.push(serverProcess);

                serverProcess.on("exit", (code) => {
                    console.log(`\n   - Server exited with code ${code}. Killing all spawned processes...`);
                    spawnedProcesses.forEach((child) => child.kill());
                    process.exit(1);
                });
            } else {
                console.error("   - Error setting execute permission for bedrock_server.");
            }
        });
    } else if (os.type() === "Windows_NT") {
        const serverProcess = spawn("cmd", ["/c", serverPath], {
            stdio: "inherit",
            cwd: bedrockServerDir,
        });
        spawnedProcesses.push(serverProcess);

        serverProcess.on("exit", (code) => {
            console.log(`\n   - Server exited with code ${code}. Killing all spawned processes...`);
            spawnedProcesses.forEach((child) => child.kill());
            process.exit(1);
        });
    } else {
        console.error("   - Unsupported OS: " + os.type());
    }
}

checkAndBuild();
