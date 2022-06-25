/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";

function resetPrefix(player) {
    let sanitize = player.getTags();
    for (let tag of sanitize) {
        if (tag.startsWith('Prefix:')) {
            player.removeTag(tag);
            config.customcommands.prefix = "!";
        }
    }
    sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Prefix has been reset!`);
}

function prefixHelp(player, prefix) {
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: prefix`,
        `§4[§6Usage§4]§r: prefix [optional]`,
        `§4[§6Optional§4]§r: prefix, help`,
        `§4[§6Description§4]§r: Changes the prefix for commands. Max is two characters.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}prefix !!`,
        `    ${prefix}prefix @!`,
        `    ${prefix}prefix $`,
        `    ${prefix}prefix help`,
    ]);
}

/**
 * @name prefix
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function prefix(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/prefix.js:9)");
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
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.prefix) {
        return prefixHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return prefixHelp(player, prefix);
    }

    // check if array contains the string 'reset'
    let argcheck = args.includes('reset');

    // reset prefix
    if (argcheck === true) {
        resetPrefix(player);
        return;
    }

    if (args[0][0] == '/') {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Using prefix '/' is not allowed!`);
    }

    // Change Prefix command under conditions
    if (args[0].length <= 2 && args[0].length >=1) {
        resetPrefix(player);
        config.customcommands.prefix = args[0];
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Prefix has been changed to '${args[0]}'!`);
        return player.addTag('Prefix:' + args[0]);
    } else {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Prefix length cannot be more than 2 characters!`);
    }
}
