import config from "../../data/config.js";
import { crypto, disabler, getPrefix, getScore } from "../../util.js";

function autoauraHelp(player, prefix, autoaurascore) {
    let commandStatus;
    if (!config.customcommands.autoaura) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (autoaurascore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: autoaura
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: autoaura [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles Auto KillAura checks for all players.
§4[§6Examples§4]§r:
    ${prefix}autoaura
    ${prefix}autoaura help
"}]}`);
}

/**
 * @name autoaura
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function autokillaura(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/autoaura.js:7)");
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

    let autoaurascore = getScore("autoaura", player);

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.autoaura) {
        return autoauraHelp(player, prefix, autoaurascore);
    }

    if (autoaurascore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config autoaura 1`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Autoaura§r!"}]}`);
    } else if (autoaurascore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config autoaura 0`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Autoaura§r!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a autoaura = paradox:config autoaura`);
}
