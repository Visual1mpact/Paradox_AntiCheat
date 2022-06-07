import config from "../../data/config.js";
import { crypto, disabler, getPrefix, getScore } from "../../util.js";

function enchantedArmorHelp(player, prefix, encharmorscore) {
    let commandStatus;
    if (!config.customcommands.enchantedarmor) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (encharmorscore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: enchantedarmor
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: enchantedarmor [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles Anti Enchanted Armor for all players.
§4[§6Examples§4]§r:
    ${prefix}enchantedarmor
    ${prefix}enchantedarmor help
"}]}`);
}

/**
 * @name enchantedarmor
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function enchantedarmor(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/enchantedarmor.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    let encharmorscore = getScore("encharmor", player);

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.enchantedarmor) {
        return enchantedArmorHelp(player, prefix, encharmorscore);
    }

    if (encharmorscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config encharmor 1`);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Anti Enchanted Armor§r!"}]}`);
    } else if (encharmorscore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config encharmor 0`);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Anti Enchanted Armor§r!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a encharmor = paradox:config encharmor`);
}