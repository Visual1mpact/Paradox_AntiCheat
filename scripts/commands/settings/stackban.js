import { crypto, disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";

function stackBanHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.stackban) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (!config.modules.stackBan.enabled) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: stackban
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: stackban [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles checks for player's with illegal stacks over 64.
§4[§6Examples§4]§r:
    ${prefix}stackban
    ${prefix}stackban help
"}]}`);
}

/**
 * @name stackban
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function stackban(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/stackban.js:6)");
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
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.stackban) {
        return stackBanHelp(player, prefix);
    }

    if (!config.modules.illegalitemsA.enabled && !config.modules.illegalitemsB.enabled && !config.modules.illegalitemsC.enabled) {
        if (config.modules.stackBan.enabled) {
            // In this stage they are likely turning it off so oblige their request
            return config.modules.stackBan.enabled = false;
        }
        // If illegal items are not enabled then let user know this feature is inaccessible
        // It will not work without one of them
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to enable Illegal Items to use this feature."}]}`);
    }

    if (config.modules.stackBan.enabled === false) {
        // Allow
        config.modules.stackBan.enabled = true;
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6StackBans§r!"}]}`);
        return;
    } else if (config.modules.stackBan.enabled === true) {
        // Deny
        config.modules.stackBan.enabled = false;
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4StackBans§r!"}]}`);
        return;
    }
}
