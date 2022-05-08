import { disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";

function spammerDHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.spammerd) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    let moduleStatus;
    if (!config.modules.spammerD.enabled) {
        moduleStatus = "§6[§4DISABLED§6]§r"
    } else {
        moduleStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: spammerd
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: spammerd [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles checks for messages sent while GUI is open.
§4[§6Examples§4]§r:
    ${prefix}spammerd
    ${prefix}spammerd help
"}]}`)
}

/**
 * @name spammerD
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function spammerD(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/spammerD.js:5)");
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
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.spammerd) {
        return spammerDHelp(player, prefix);
    }

    if (config.modules.spammerD.enabled === false) {
        // Allow
        config.modules.spammerD.enabled = true;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6SpammerD§r!"}]}`);
        return;
    } else if (config.modules.spammerD.enabled === true) {
        // Deny
        config.modules.spammerD.enabled = false;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4SpammerD§r!"}]}`);
        return;
    }
}
