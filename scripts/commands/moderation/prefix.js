/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { crypto, disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";

function resetPrefix(player) {
    let sanitize = player.getTags();
    for (let tag of sanitize) {
        if (tag.startsWith('Prefix:')) {
            player.removeTag(tag);
            config.customcommands.prefix = "!";
        }
    }
    return player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has reset their prefix!"}]}`);
}

function prefixHelp(player, prefix) {
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: prefix
§4[§6Usage§4]§r: prefix [optional]
§4[§6Optional§4]§r: prefix, help
§4[§6Description§4]§r: Changes the prefix for commands. Max is two characters.
§4[§6Examples§4]§r:
    ${prefix}prefix !!
    ${prefix}prefix @!
    ${prefix}prefix $
    ${prefix}prefix help
"}]}`);
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
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
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

    let regex = /\//g;
    if (regex.test(args[0])) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Using prefix / is not allowed!"}]}`);
    }

    // Change Prefix command under conditions
    if (args[0].length <= 2 && args[0].length >=1) {
        resetPrefix(player);
        config.customcommands.prefix = args[0];
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has changed their Prefix to ${args[0]}"}]}`);
        return player.addTag('Prefix:' + args[0]);
    } else {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to limit the Prefix to 2 characters or less!"}]}`);
    }
}
