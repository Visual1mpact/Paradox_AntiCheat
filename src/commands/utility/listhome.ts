import { BeforeChatEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { getPrefix, sendMsgToPlayer } from "../../util.js";

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
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function listhome(message: BeforeChatEvent, args: string[]) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/listhome.js:26)");
    }

    message.cancel = true;

    const player = message.sender;

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.listhome) {
        return listHomeHelp(player, prefix);
    }

    const tags = player.getTags();
    let counter = 0;
    let verify = false;
    for (let i = 0; i < tags.length; i++) {
        if (tags[i].startsWith("LocationHome:")) {
            // Split string into array
            const coordinatesArray = tags[i].split(" ");
            let home: string;
            let homex: number;
            let homey: number;
            let homez: number;
            let dimension: string;
            counter = ++counter;
            for (let i = 0; i < coordinatesArray.length; i++) {
                // Get their location from the array
                if (coordinatesArray[i].includes("LocationHome:")) {
                    home = coordinatesArray[i].replace("LocationHome:", "");
                }
                if (coordinatesArray[i].includes("X:")) {
                    homex = parseInt(coordinatesArray[i].replace("X:", ""));
                }
                if (coordinatesArray[i].includes("Y:")) {
                    homey = parseInt(coordinatesArray[i].replace("Y:", ""));
                }
                if (coordinatesArray[i].includes("Z:")) {
                    homez = parseInt(coordinatesArray[i].replace("Z:", ""));
                }
                if (coordinatesArray[i].includes("Dimension:")) {
                    dimension = coordinatesArray[i].replace("Dimension:", "");
                }
                if (!homex || !homey || !homez || !dimension) {
                    continue;
                } else {
                    verify = true;
                    if (counter === 1) {
                        sendMsgToPlayer(player, `§l§6[§4List Of Homes§6]§r`);
                    }
                    sendMsgToPlayer(player, ` | §4[§f${home}§4]§r §6=>§r ${homex} ${homey} ${homez} §6<=§r §4[§f${dimension}§4]§r`);
                    continue;
                }
            }
            continue;
        }
        continue;
    }
    if (verify === false) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You have none saved locations.`);
    }
    return;
}
