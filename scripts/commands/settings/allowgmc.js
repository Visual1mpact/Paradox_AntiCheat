import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

function allowgmcHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.allowgmc) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    let moduleStatus;
    if (!config.modules.creativeGM.enabled) {
        moduleStatus = "§6[§4DISABLED§6]§r"
    } else {
        moduleStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: allowgmc
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: allowgmc [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles Gamemode 1 (Creative) to be used.
§4[§6Examples§4]§r:
    ${prefix}allowgmc
    ${prefix}allowgmc help
"}]}`)
}

/**
 * @name allowgmc
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function allowgmc(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/allowGMC.js:7)");
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
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.allowgmc) {
        return allowgmcHelp(player, prefix);
    }

    if (config.modules.creativeGM.enabled === false) {
        // Allow
        config.modules.creativeGM.enabled = true;
        // Make sure at least one is allowed since this could cause serious issues if all were locked down
        // We will allow Adventure Mode in this case
        if (config.modules.adventureGM.enabled === true && config.modules.survivalGM.enabled === true) {
            config.modules.adventureGM.enabled = false;
            return player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r Since all gamemodes were disallowed, Adventure mode has been enabled."}]}`);
        }
        return player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disallowed §4Gamemode 1 (Creative)§r to be used!"}]}`);
    } else if (config.modules.creativeGM.enabled === true) {
        // Deny
        config.modules.creativeGM.enabled = false;
        return player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has allowed §6Gamemode 1 (Creative)§r to be used!"}]}`);
    }
}
