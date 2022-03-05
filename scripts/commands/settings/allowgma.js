import { disabler, getScore } from "../../util.js";

/**
 * @name allowgma
 * @param {object} message - Message object
 */
export function allowgma(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/allowGMA.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    try {
        player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=paradoxOpped]`);
    } catch (error) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    let gmascore = getScore(gma, player);

    if (gmascore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config gma 1`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disallowed §4Gamemode 2 (Adventure)§r to be used!"}]}`);
    } else if (gmascore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config gma 0`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has allowed §6Gamemode 2 (Adventure)§r to be used!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a gma = paradox:config gma`);
}
