import { disabler } from "../../util.js";

/**
 * @name credits
 * @param {object} message - Message object
 */
export function credits(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/credits.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    try {
        player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=paradoxOpped]`);
    } catch (error) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
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
