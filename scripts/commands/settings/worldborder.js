import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

function worldBorderHelp(player, prefix, worldBorderScore) {
    let commandStatus;
    if (!config.customcommands.worldborder) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    let moduleStatus;
    if (worldBorderScore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§r"
    } else {
        moduleStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: worldborder
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: worldborder <value> [optional]
§4[§6Optional§4]§r: disable, help
§4[§6Description§4]§r: Sets the world border and restricts players to that border.
§4[§6Examples§4]§r:
    ${prefix}worldborder 1000
    ${prefix}worldborder 25689
    ${prefix}worldborder disable
    ${prefix}worldborder help
"}]}`)
}

/**
 * @name worldborder
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function worldborders(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/worldborder.js:5)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    let worldBorderScore = getScore("worldborder", player);

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.worldborder) {
        return worldBorderHelp(player, prefix, worldBorderScore);
    }


    if (argCheck !== "disable" && isNaN(argCheck) === false) {
        // Build the wall
        player.runCommand(`scoreboard players set paradox:config worldborder ${argCheck}`);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border§r to ${argCheck}!"}]}`);
        player.runCommand(`scoreboard players operation @a worldborder = paradox:config worldborder`);
        config.modules.worldBorder.bordersize = argCheck;
        return config.modules.worldBorder.enabled = true;
    } else if (argCheck === "disable") {
        // Disable Worldborder
        player.runCommand(`scoreboard players set paradox:config worldborder 0`);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled the §6World Border§r!"}]}`);
        player.runCommand(`scoreboard players operation @a worldborder = paradox:config worldborder`);
        return config.modules.worldBorder.enabled = false;
    } else {
        return worldBorderHelp(player, prefix);
    }
}
