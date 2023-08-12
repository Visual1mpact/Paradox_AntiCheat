import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { decryptString, encryptString, getPrefix, sendMsgToPlayer } from "../../util.js";

function delhomeHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.delhome) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: delhome`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: delhome [optional]`,
        `§4[§6Optional§4]§r: name, help`,
        `§4[§6Description§4]§r: Will delete specified saved home location.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}delhome cave`,
        `    ${prefix}delhome help`,
    ]);
}

/**
 * @name delhome
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function delhome(message: ChatSendAfterEvent, args: string[]) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/delhome.js:26)");
    }

    const player = message.sender;

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return delhomeHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.delhome) {
        return delhomeHelp(player, prefix);
    }

    // Don't allow spaces
    if (args.length > 1) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r No spaces in names please!`);
    }

    // Hash the coordinates for security
    const salt = world.getDynamicProperty("crypt");

    // Find and delete this saved home location
    let verify = false;
    let encryptedString: string = "";
    const tags = player.getTags();
    for (let i = 0; i < tags.length; i++) {
        // 6f78 is temporary and will be removed
        if (tags[i].startsWith("6f78")) {
            // Remove old encryption
            player.removeTag(tags[i])
            // Change to AES Encryption so we can abandon the old method
            tags[i] = decryptString(tags[i], salt as string);
            tags[i] = encryptString(tags[i], salt as string)
            player.addTag(tags[i])
        }
        if (tags[i].startsWith("1337")) {
            encryptedString = tags[i];
            // Decode it so we can verify it
            tags[i] = decryptString(tags[i], salt as string);
        }
        if (tags[i].startsWith(args[0].toString() + " X", 13)) {
            verify = true;
            player.removeTag(encryptedString);
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Successfully deleted home '${args[0]}'!`);
            break;
        }
    }
    if (verify === true) {
        return;
    } else {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Home '${args[0]}' does not exist!`);
    }
}
