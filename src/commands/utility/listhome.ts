import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { decryptString, getPrefix, encryptString, sendMsgToPlayer } from "../../util.js";

function listHomeHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.listhome) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: listhome`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: listhome [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Shows a list of saved home locations.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}listhome`,
        `    ${prefix}listhome help`,
    ]);
}

/**
 * @name listhome
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function listhome(message: ChatSendAfterEvent, args: string[]) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/listhome.js:26)");
    }

    const player = message.sender;

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.listhome) {
        return listHomeHelp(player, prefix);
    }

    // Hash the coordinates for security
    const salt = world.getDynamicProperty("crypt");

    // Create an array to store the home location messages
    const homeMessages: string[] = [];

    const tags = player.getTags();
    let counter = 0;
    for (let i = 0; i < tags.length; i++) {
        /**
         * This first if statement is to verify if they have old coordinates
         * not encrypted. If so then we encrypt it now. This is only a temporary
         * patch to minimize players having to manually record and remove the old
         * tags. Eventually this will be removed.
         */
        if (tags[i].startsWith("LocationHome:")) {
            player.removeTag(tags[i]);
            tags[i] = encryptString(tags[i], String(salt));
            player.addTag(tags[i]);
        }
        if (tags[i].startsWith("6f78")) {
            // Decode it so we can verify it
            tags[i] = decryptString(tags[i], String(salt));
            // If invalid then skip it
            if (tags[i].startsWith("LocationHome:") === false) {
                continue;
            }
            // Split string into array
            const coordinatesArray = tags[i].split(" ");
            let home: string;
            let homex: number;
            let homey: number;
            let homez: number;
            let dimension: string;
            counter = ++counter;
            for (let j = 0; j < coordinatesArray.length; j++) {
                // Get their location from the array
                if (coordinatesArray[j].includes("LocationHome:")) {
                    home = coordinatesArray[j].replace("LocationHome:", "");
                }
                if (coordinatesArray[j].includes("X:")) {
                    homex = parseInt(coordinatesArray[j].replace("X:", ""));
                }
                if (coordinatesArray[j].includes("Y:")) {
                    homey = parseInt(coordinatesArray[j].replace("Y:", ""));
                }
                if (coordinatesArray[j].includes("Z:")) {
                    homez = parseInt(coordinatesArray[j].replace("Z:", ""));
                }
                if (coordinatesArray[j].includes("Dimension:")) {
                    dimension = coordinatesArray[j].replace("Dimension:", "");
                }
                // Inside the loop where you are processing each home location
                if (!homex || !homey || !homez || !dimension) {
                    continue;
                } else {
                    if (counter === 1) {
                        homeMessages.push(`§r§4[§6Paradox§4]§r List Of Homes:`);
                    }
                    homeMessages.push(` §6|§r §4[§f${home}§4]§r §6=>§r ${homex} ${homey} ${homez} §6<=§r §4[§f${dimension}§4]§r`);
                }
            }
        }
        continue;
    }
    if (homeMessages.length > 0) {
        // Send all the home location messages at once using sendMsgToPlayer
        sendMsgToPlayer(player, homeMessages);
    } else {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You have none saved locations.`);
    }
    return;
}
