import { crypto, disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";

function reachCHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.reachc) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    let moduleStatus;
    if (!config.modules.reachC.enabled) {
        moduleStatus = "§6[§4DISABLED§6]§r"
    } else {
        moduleStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: reachc
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: reachc [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles checks for player's attacking beyond reach.
§4[§6Examples§4]§r:
    ${prefix}reachc
    ${prefix}reachc help
"}]}`)
}

/**
 * @name reachC
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function reachC(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/reachc.js:5)");
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
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.reachc) {
        return reachCHelp(player, prefix);
    }

    if (config.modules.reachC.enabled === false) {
        // Allow
        config.modules.reachC.enabled = true;
        player.runCommand(`tellraw @a[tag=${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6ReachC§r!"}]}`);
        return;
    } else if (config.modules.reachC.enabled === true) {
        // Deny
        config.modules.reachC.enabled = false;
        player.runCommand(`tellraw @a[tag=${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4ReachC§r!"}]}`);
        return;
    }
}
