import { crypto, disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";

function salvageHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.salvage) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (!config.modules.salvage.enabled) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: salvage
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: salvage [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles new salvage system [Experimental].
§4[§6Examples§4]§r:
    ${prefix}salvage
    ${prefix}salvage help
"}]}`);
}

/**
 * @name salvage
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function salvage(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/salvage.js:32)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.salvage) {
        return salvageHelp(player, prefix);
    }

    if (config.modules.salvage.enabled === false) {
        // Allow
        config.modules.salvage.enabled = true;
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Salvage§r!"}]}`);
        return;
    } else if (config.modules.salvage.enabled === true) {
        // Deny
        config.modules.salvage.enabled = false;
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Salvage§r!"}]}`);
        return;
    }
}
