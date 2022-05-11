import config from "../../data/config.js";
import { disabler, getPrefix, getScore } from "../../util.js";

function autoclickerHelp(player, prefix, autoclickerscore) {
    let commandStatus;
    if (!config.customcommands.autoclicker) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    let moduleStatus;
    if (autoclickerscore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§r"
    } else {
        moduleStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: autoclicker
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: autoclicker [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles checks for players using autoclickers while attacking.
§4[§6Examples§4]§r:
    ${prefix}autoclicker
    ${prefix}autoclicker help
"}]}`)
}

/**
 * @name autoclicker
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function autoclick(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/autoclicker.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    let autoclickerscore = getScore("autoclicker", player);

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.autoclicker) {
        return autoclickerHelp(player, prefix, autoclickerscore);
    }

    if (autoclickerscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config autoclicker 1`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Anti Autoclicker§r!"}]}`);
    } else if (autoclickerscore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config autoclicker 0`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Anti Autoclicker§r!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a autoclicker = paradox:config autoclicker`);
}
