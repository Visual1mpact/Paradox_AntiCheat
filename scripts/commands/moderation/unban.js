import { crypto, disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";

export const queueUnban = new Set();

function unbanHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.unban) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: unban
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: unban [optional]
§4[§6Optional§4]§r: username, list, help
§4[§6Description§4]§r: Allows specified players to join if banned (Doesn't include global ban).
§4[§6Examples§4]§r:
    ${prefix}unban ${disabler(player.nameTag)}
    ${prefix}unban list
    ${prefix}unban help
"}]}`)
}

/**
 * @name unban
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function unban(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/unban.js:29)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes(crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.unban) {
        return unbanHelp(player, prefix);
    } else if (argCheck && args[0].toLowerCase() === "list" || !config.customcommands.unban) {
        function listQueue(queue) {
            if (queue) {
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ${queue} is queued to be unbanned!"}]}`);
            }
        }
        queueUnban.forEach((queue) => listQueue(queue));
        return;
    }

    // Add player to queue
    queueUnban.add(args[0]);
    return player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r ${args[0]} is queued to be unbanned!"}]}`);
}
