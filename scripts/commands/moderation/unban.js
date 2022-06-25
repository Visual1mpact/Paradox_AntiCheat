import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";

export const queueUnban = new Set();

function listQueue(queue, player) {
    if (queue) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r ${player.nameTag}§r is queued to be unbanned`);
    }
}

function unbanHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.unban) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: unban`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: unban [optional]`,
        `§4[§6Optional§4]§r: username, list, help`,
        `§4[§6Description§4]§r: Allows specified players to join if banned (Doesn't include global ban).`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}unban ${player.name}`,
        `    ${prefix}unban list`,
        `    ${prefix}unban help`,
    ]);
}

/**
 * @name unban
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function unban(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/unban.js:34)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.unban) {
        return unbanHelp(player, prefix);
    } else if (argCheck && args[0].toLowerCase() === "list" || !config.customcommands.unban) {
        queueUnban.forEach((queue) => listQueue(queue, player));
        return;
    }

    // Add player to queue
    let regexp = /["'`]/g;
    queueUnban.add(args.join(" ").replace(regexp, ""));
    sendMsg('@a[tag=paradoxOpped', `§r§4[§6Paradox§4]§r ${args.join(" ").replace(regexp, "")} is queued to be unbanned!`);
}
