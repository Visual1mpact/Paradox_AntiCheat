const fs = require("fs");
const https = require("https");
const readline = require("readline");
const path = require("path");
const AdmZip = require("adm-zip");

// Function to retrieve the latest BDS version
function getLatestVersion() {
    const apiURL = "https://ssk.taiyu.workers.dev/zh-hans/download/server/bedrock";
    return new Promise((resolve, reject) => {
        https
            .get(apiURL, (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    const versionMatches = data.match(/bedrock-server-[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/g);
                    if (versionMatches && versionMatches.length > 0) {
                        const latestVersion = versionMatches.map((version) => version.split("-").pop()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))[0]; // Use the first version
                        resolve(latestVersion);
                    } else {
                        reject("Failed to retrieve the latest version.");
                    }
                });
            })
            .on("error", (error) => {
                reject(error);
            });
    });
}

// Function to download the BDS server
function downloadBDS(version) {
    const osType = require("os").platform();
    let downloadURL;

    if (osType === "linux") {
        downloadURL = `https://minecraft.azureedge.net/bin-linux/bedrock-server-${version}.zip`;
    } else if (osType === "win32") {
        downloadURL = `https://minecraft.azureedge.net/bin-win/bedrock-server-${version}.zip`;
    } else {
        return Promise.reject("> Unsupported operating system: " + osType);
    }

    const downloadLocation = `bedrock-server-${version}.zip`;

    return new Promise((resolve, reject) => {
        console.log(`> Downloading Minecraft BDS version ${version} for ${osType}...`);

        const file = fs.createWriteStream(downloadLocation);

        const request = https.get(downloadURL, (response) => {
            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(downloadLocation); // Remove the incomplete file
                reject(`   - Failed to download. HTTP status code: ${response.statusCode}\n`);
                return;
            }

            response.pipe(file);

            response.on("end", () => {
                file.end(() => {
                    console.log("   - Download complete.\n");
                    resolve(downloadLocation);
                });
            });
        });

        request.on("error", (error) => {
            fs.unlink(downloadLocation, () => {
                reject(`   - Failed to download: ${error.message}\n`);
            });
        });
    });
}

async function extractBDS(version) {
    const zipFile = `bedrock-server-${version}.zip`;
    const extractionDir = `bedrock-server-${version}`;

    console.log(`> Extracting Minecraft BDS version ${version}...`);

    return new Promise((resolve, reject) => {
        try {
            const zip = new AdmZip(zipFile);
            zip.extractAllTo(extractionDir, /*overwrite*/ true);

            console.log("   - Extraction complete.\n");
            resolve();
        } catch (error) {
            console.error(`   - Extraction error: ${error.message}\n`);
            reject(error);
        }
    });
}

// Main script
async function main() {
    try {
        const latestVersion = await getLatestVersion();
        const oldVersionDir = getLatestOldVersion();
        const newVersionDir = `bedrock-server-${latestVersion}`;

        if (oldVersionDir) {
            console.log(`> Found old version directory: ${oldVersionDir}\n`);
            const oldVersion = oldVersionDir.replace("bedrock-server-", "");

            if (oldVersion === latestVersion) {
                console.log("> Old version and new version are the same. Aborting.");
                return;
            }
        }

        const downloadLocation = await downloadBDS(latestVersion);

        // Proceed with extraction
        await extractBDS(latestVersion, downloadLocation);

        // Delete the zip archive after extraction is complete
        deleteZipArchive(downloadLocation);

        copyFolders(oldVersionDir, newVersionDir);
        updateServerProperties(oldVersionDir, newVersionDir);
    } catch (error) {
        console.error(error);
    }
}

function getLatestOldVersion() {
    const dirs = fs.readdirSync(process.cwd()).filter((file) => fs.lstatSync(file).isDirectory() && file.startsWith("bedrock-server-"));
    if (dirs.length === 0) {
        return null;
    }

    return dirs
        .sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
        })
        .pop();
}

function copyFolders(oldVersionDir, newVersionDir) {
    console.log("> Copying worlds and development packs folders...");

    const oldWorldsDir = `${oldVersionDir}/worlds`;
    const newWorldsDir = `${newVersionDir}/worlds`;

    const oldDevBehavPacksDir = `${oldVersionDir}/development_behavior_packs`;
    const newDevBehavPacksDir = `${newVersionDir}/development_behavior_packs`;

    const oldDevResPacksDir = `${oldVersionDir}/development_resource_packs`;
    const newDevResPacksDir = `${newVersionDir}/development_resource_packs`;

    const newWorldBetaApiDir = "new-world-beta-api";

    let copied = false; // Flag to track if anything was copied

    // Ensure that the destination directories are created before copying
    if (!fs.existsSync(newWorldsDir)) {
        fs.mkdirSync(newWorldsDir, { recursive: true });
    }
    if (!fs.existsSync(newDevBehavPacksDir)) {
        fs.mkdirSync(newDevBehavPacksDir, { recursive: true });
    }
    if (!fs.existsSync(newDevResPacksDir)) {
        fs.mkdirSync(newDevResPacksDir, { recursive: true });
    }

    if (fs.existsSync(oldWorldsDir) && fs.existsSync(newWorldsDir)) {
        copyDirectory(oldWorldsDir, newWorldsDir);
        console.log("   - Worlds copied.");
        copied = true;
    } else if (fs.existsSync(newWorldBetaApiDir)) {
        // Copy the 'new-world-beta-api' folder to a subfolder within 'worlds' if 'worlds' is empty
        console.log("   - Copying 'new-world-beta-api' folder.");
        const subfolderName = "Bedrock level"; // Specify the subfolder name
        const subfolderPath = path.join(newWorldsDir, subfolderName); // Use path.join for correct path concatenation
        if (!fs.existsSync(newWorldsDir)) {
            fs.mkdirSync(newWorldsDir, { recursive: true }); // Create the "worlds" directory if it doesn't exist
        }
        if (!fs.existsSync(subfolderPath)) {
            fs.mkdirSync(subfolderPath, { recursive: true }); // Create the subfolder within 'worlds'
        }
        copyDirectory(newWorldBetaApiDir, subfolderPath); // Copy 'new-world-beta-api' contents to the subfolder
        console.log(`   - '${newWorldBetaApiDir}' folder copied to '${subfolderName}' within 'worlds'.`);
    }

    if (fs.existsSync(oldDevBehavPacksDir) && fs.existsSync(newDevBehavPacksDir)) {
        copyDirectory(oldDevBehavPacksDir, newDevBehavPacksDir);
        console.log("   - Development behavior packs copied.");
        copied = true;
    }

    if (fs.existsSync(oldDevResPacksDir) && fs.existsSync(newDevResPacksDir)) {
        copyDirectory(oldDevResPacksDir, newDevResPacksDir);
        console.log("   - Development resource packs copied.");
        copied = true;
    }

    if (!copied) {
        console.log("   - No additional folders to copy.\n");
    } else {
        console.log("\n");
    }
}

function copyDirectory(source, destination) {
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    const files = fs.readdirSync(source);
    for (const file of files) {
        const sourcePath = `${source}/${file}`;
        const destPath = `${destination}/${file}`;

        if (fs.lstatSync(sourcePath).isDirectory()) {
            copyDirectory(sourcePath, destPath);
        } else {
            fs.copyFileSync(sourcePath, destPath);
        }
    }
}

async function updateServerProperties(oldVersionDir, newVersionDir) {
    const oldPropertiesFile = `${oldVersionDir}/server.properties`;
    const newPropertiesFile = `${newVersionDir}/server.properties`;

    console.log("> Comparing server.properties...");

    if (fs.existsSync(oldPropertiesFile) && fs.existsSync(newPropertiesFile)) {
        const oldProperties = readPropertiesFile(oldPropertiesFile);
        const newProperties = readPropertiesFile(newPropertiesFile);

        const updatedProperties = { ...oldProperties }; // Copy old properties

        for (const key in oldProperties) {
            if (newProperties[key] !== oldProperties[key]) {
                console.log("\nDifference found:");
                console.log(`   - Old: ${key}=${oldProperties[key]}`);
                console.log(`   - New: ${key}=${newProperties[key]}`);

                const validResponses = ["y", "yes"];
                const choice = await askQuestion("Apply this change? (y/n): ");

                if (validResponses.includes(choice.toLowerCase())) {
                    updatedProperties[key] = oldProperties[key];
                    console.log("Change applied.");
                }
            }
        }

        // Ensure that "allow-inbound-script-debugging=true" is added
        if (!updatedProperties["allow-inbound-script-debugging"]) {
            updatedProperties["allow-inbound-script-debugging"] = "true";
        }

        // Write the updated properties back to the new properties file
        writePropertiesFile(newPropertiesFile, updatedProperties);

        // Append "allow-inbound-script-debugging=true" to the end
        fs.appendFileSync(newPropertiesFile, "allow-inbound-script-debugging=true\n");

        console.log("\n> Server properties update complete.");
    } else {
        console.log("   - No file to compare.");
    }
}

function writePropertiesFile(filePath, properties) {
    const lines = [];
    const fileContents = fs.readFileSync(filePath, "utf8");
    const fileLines = fileContents.split("\n");

    for (const line of fileLines) {
        if (line.trim() === "" || line.startsWith("#")) {
            // Preserve empty lines and comments
            lines.push(line);
        } else {
            const parts = line.split("=");
            if (parts[0] in properties) {
                // Replace the modified line
                lines.push(`${parts[0]}=${properties[parts[0]]}`);
            } else {
                // Preserve unmodified lines
                lines.push(line);
            }
        }
    }

    fs.writeFileSync(filePath, lines.join("\n"));
}

function readPropertiesFile(filePath) {
    const properties = {};
    const fileContents = fs.readFileSync(filePath, "utf8");
    const lines = fileContents.split("\n");
    for (const line of lines) {
        if (!line.startsWith("#") && line.trim() !== "") {
            const [key, value] = line.split("=");
            properties[key.trim()] = value.trim();
        }
    }
    return properties;
}

function askQuestion(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

function deleteZipArchive(zipPath) {
    try {
        fs.unlinkSync(zipPath);
        console.log(`\n> Deleted zip archive: ${zipPath}`);
    } catch (error) {
        console.error(`\nFailed to delete zip archive: ${error}`);
    }
}

main();
