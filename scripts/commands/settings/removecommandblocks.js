import config from "../../data/config.js";
import { disabler, getPrefix, getScore } from "../../util.js";

function removeCBEHelp(player, prefix, commandblocksscore) {
    let commandStatus;
    if (!config.customcommands.removecommandblocks) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    let moduleStatus;
    if (commandblocksscore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§r"
    } else {
        moduleStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: removecb
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: removecb [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles Anti Command Blocks (Clears all when enabled).
§4[§6Examples§4]§r:
    ${prefix}removecb
    ${prefix}removecb help
"}]}`)
}

/**
 * @name removecommandblocks
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function removecommandblocks(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/removeCommandBlocks.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    let commandblocksscore = getScore("commandblocks", player);

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.removecommandblocks) {
        return removeCBEHelp(player, prefix, commandblocksscore);
    }

    if (commandblocksscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config commandblocks 1`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Anti Command Blocks§r!"}]}`);
    } else if (commandblocksscore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config commandblocks 0`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Anti Command Blocks§r!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a commandblocks = paradox:config commandblocks`);
}
