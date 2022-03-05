import { disabler, getScore } from "../../util.js";

/**
 * @name nofrostwalker
 * @param {object} message - Message object
 */
export function nofrostwalker(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/nofrostwalker.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    try {
        player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=paradoxOpped]`);
    } catch (error) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    let frostwalkerscore = getScore(frostwalker, player);

    if (frostwalkerscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config frostwalker 1`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Anti Frostwalker!"}]}`);
    } else if (frostwalkerscore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config frostwalker 0`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Anti Frostwalker!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a frostwalker = paradox:config frostwalker`);
}
