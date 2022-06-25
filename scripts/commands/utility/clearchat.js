import config from "../../data/config.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

function clearChatHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.clearchat) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: clearchat`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: clearchat [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Will clear the chat.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}clearchat`,
        `    ${prefix}clearchat help`,
    ]);
}

/**
 * @name clearchat
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function clearchat(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./utility/notify.js:7)");
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
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.clearchat) {
        return clearChatHelp(player, prefix);
    }

    for (let clear = 0; clear < 10; clear++) sendMsg('@a', '\n'.repeat(60));

    sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r Chat has been cleared by ${player.nameTag}`);
}
