import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

function notifyHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.notify) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: notify
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: notify [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles cheat notifications like a toggle.
§4[§6Examples§4]§r:
    ${prefix}notify
    ${prefix}notify help
"}]}`);
}

/**
 * @name notify
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function notify(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/notify.js:7)");
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
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.notify) {
        return notifyHelp(player, prefix);
    }

    if (player.hasTag('notify')) {
        player.addTag('nonotify');
    }

    if (player.hasTag('nonotify')) {
        player.removeTag('notify');
    }

    if (player.hasTag('nonotify')) {
        player.runCommand(`tellraw @s {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r You have disabled cheat notifications."}]}`);
    }

    if (!player.hasTag('nonotify')) {
        player.addTag('notify');
    }

    if (player.hasTag('notify') && !player.hasTag('nonotify')) {
        player.runCommand('tellraw @s {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r You have enabled cheat notifications."}]}');
    }

    if (player.hasTag('nonotify')) {
        player.removeTag('nonotify');
    }
}
