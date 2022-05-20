import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

function creditsHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.credits) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: credits
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: credits [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Shows credits for Paradox Anti Cheat.
§4[§6Examples§4]§r:
    ${prefix}credits
    ${prefix}credits help
"}]}`)
}

/**
 * @name credits
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function credits(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/credits.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag(crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.credits) {
        return creditsHelp(player, prefix);
    }

    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§l§6                    Based on Scythe AntiCheat"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§l§4-----------------------------------------------------"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§lGithub:§r https://https://github.com/MrDiamond64/Scythe-AntiCheat"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§lDeveloped and maintained by MrDiamond64"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§l§6                 Major Contributers For Scythe"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§l§4-----------------------------------------------------"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"Visual1mpact#1435 - Porting function-based commands to GameTest commands and finding many bugs"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n"}]}`);

    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§l§6                        Paradox AntiCheat"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§l§4-----------------------------------------------------"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§lGithub:§r https://github.com/Visual1mpact/Paradox_AntiCheat"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§lParadox AntiCheat§r - a utility to fight against malicious hackers on Bedrock Edition."}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§lDeveloped and maintained by Visual1mpact"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§l§6                 Major Contributers For Paradox"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§l§4-----------------------------------------------------"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"Glitch#8024 - Implementing features and bug fixes"}]}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n"}]}`);
    return;
}
