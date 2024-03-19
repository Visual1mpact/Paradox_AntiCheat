const fs = require("fs");
const path = require("path");
const util = require("util");
const { spawn } = require("child_process");
const os = require("os");
const fse = require("fs-extra");
const glob = require("glob");

// Add this line to import exec
const exec = util.promisify(require("child_process").exec);

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

    // Check if the 'Bedrock level' subfolder exists in 'worlds', and if not, create it
    const testWorldDir = path.join(worldsDir, "Bedrock level");
    if (!fs.existsSync(testWorldDir)) {
        fs.mkdirSync(testWorldDir);
    }

    // Copy 'new-world-beta-api'
    fse.copySync("new-world-beta-api", testWorldDir);

    // Determine the OS type and execute the appropriate build command
    if (os.type() === "Linux") {
        await exec("npm run build");
    } else if (os.type() === "Windows_NT") {
        await exec("npm run build_win");
    } else {
        console.error("Unsupported OS: " + os.type());
        return;
    }

    // Copy the build contents to the 'bedrock-server-*/worlds/Bedrock level/behavior_packs/paradox' directory
    const buildDir = "build";
    const paradoxDir = path.join(testWorldDir, "behavior_packs", "paradox");
    fse.copySync(buildDir, paradoxDir);

    console.log(`> Copied build contents to '${bedrockServerDir}/worlds/Bedrock level/behavior_packs/paradox'...\n`);

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

            // Write the updated JSON back to the file
            fs.writeFileSync(worldBehaviorPacksPath, JSON.stringify(worldBehaviorPacks, null, 2));
        }
    }

    console.log("> Test build completed...\n");

    // Determine and execute the server based on the OS
    const serverPath = path.resolve(bedrockServerDir, "bedrock_server");

    if (os.type() === "Linux") {
        // Execute on Linux
        const sudoCommand = `LD_LIBRARY_PATH=. ${serverPath}`;
        const chmodProcess = spawn("chmod", ["+x", serverPath], {
            cwd: bedrockServerDir,
        });

        chmodProcess.on("close", (chmodCode) => {
            if (chmodCode === 0) {
                const serverProcess = spawn("sh", ["-c", `sudo ${sudoCommand}`], {
                    stdio: "inherit",
                    cwd: bedrockServerDir,
                });
                spawnedProcesses.push(serverProcess); // Add to the array

                serverProcess.on("exit", (code) => {
                    console.log(`\n   - Server exited with code ${code}. Killing all spawned processes...`);
                    spawnedProcesses.forEach((child) => {
                        child.kill();
                    });
                    process.exit(1);
                });
            } else {
                console.error("   - Error setting execute permission for bedrock_server.");
            }
        });
    } else if (os.type() === "Windows_NT") {
        // Execute on Windows
        const serverProcess = spawn("cmd", ["/c", serverPath], {
            stdio: "inherit",
            cwd: bedrockServerDir,
        });
        spawnedProcesses.push(serverProcess); // Add to the array

        serverProcess.on("exit", (code) => {
            console.log(`\n   - Server exited with code ${code}. Killing all spawned processes...`);
            spawnedProcesses.forEach((child) => {
                child.kill();
            });
            process.exit(1);
        });
    } else {
        console.error("   - Unsupported OS: " + os.type());
    }
}

checkAndBuild();
