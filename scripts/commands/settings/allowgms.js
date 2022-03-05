import { disabler, getScore } from "../../util.js";

/**
 * @name allowgms
 * @param {object} message - Message object
 */
export function allowgms(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/allowGMS.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    try {
        player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=paradoxOpped]`);
    } catch (error) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    let gmsscore = getScore("gms", player);

    if (gmsscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config gms 1`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disallowed §4Gamemode 0 (Survival)§r to be used!"}]}`);
    } else if (gmsscore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config gms 0`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has allowed §6Gamemode 0 (Survival)§r to be used!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a gms = paradox:config gms`);
}
