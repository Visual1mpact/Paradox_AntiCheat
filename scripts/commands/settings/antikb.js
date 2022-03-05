import { disabler, getScore } from "../../util.js";

/**
 * @name antiknockback
 * @param {object} message - Message object
 */
export function antiknockback(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/antikb.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    try {
        player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=paradoxOpped]`);
    } catch (error) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    let antikbscore = getScore(antikb, player);

    if (antikbscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config antikb 1`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Anti Knockback!"}]}`);
    } else if (antikbscore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config antikb 0`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Anti Knockback!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a antikb = paradox:config antikb`);
}
