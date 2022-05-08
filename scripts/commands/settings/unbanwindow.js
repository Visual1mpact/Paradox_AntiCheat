import { disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";

function unbanWindowHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.unbanwindow) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    let moduleStatus;
    if (!config.modules.unbanWindow.enabled) {
        moduleStatus = "§6[§4DISABLED§6]§r"
    } else {
        moduleStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: unbanwindow
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: unbanwindow [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Disables server ban to allow banned players to join (Does not include global ban).
§4[§6Examples§4]§r:
    ${prefix}unbanwindow
    ${prefix}unbanwindow help
"}]}`)
}

/**
 * @name unbanwindow
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function unbanwindow(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/unbanwindow.js:5)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.unbanwindow) {
        return unbanWindowHelp(player, prefix);
    }

    if (config.modules.unbanWindow.enabled === false) {
        // Allow
        config.modules.unbanWindow.enabled = true;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6BanWindow§r!"}]}`);
        return;
    } else if (config.modules.unbanWindow.enabled === true) {
        // Deny
        config.modules.unbanWindow.enabled = false;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4BanWindow§r!"}]}`);
        return;
    }
}
