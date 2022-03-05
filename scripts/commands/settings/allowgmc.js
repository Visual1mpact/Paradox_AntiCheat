import { disabler, getScore } from "../../util.js";

/**
 * @name allowgmc
 * @param {object} message - Message object
 */
export function allowgmc(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/allowGMC.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    try {
        player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=paradoxOpped]`);
    } catch (error) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    let gmcscore = getScore("gmc", player);

    if (gmcscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config gmc 1`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disallowed §4Gamemode 1 (Creative)§r to be used!"}]}`);
    } else if (gmcscore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config gmc 0`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has allowed §6Gamemode 1 (Creative)§r to be used!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a gmc = paradox:config gmc`);
}
