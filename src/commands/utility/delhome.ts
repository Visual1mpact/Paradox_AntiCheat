import { BeforeChatEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { getPrefix, sendMsgToPlayer } from "../../util.js";

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
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function delhome(message: BeforeChatEvent, args: string[]) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/delhome.js:26)");
    }

    message.cancel = true;

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

    // Find and delete this saved home location
    let verify = false;
    const tags = player.getTags();
    for (let i = 0; i < tags.length; i++) {
        if (tags[i].startsWith(args[0].toString() + " X", 13)) {
            verify = true;
            player.removeTag(tags[i]);
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
