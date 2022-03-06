import { disabler, getScore } from "../../util.js";

/**
 * @name overidecommandblocksenabled
 * @param {object} message - Message object
 */
export function overidecommandblocksenabled(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/overideCommandBlocksEnabled.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    let cmdsscore = getScore("cmds", player);

    if (cmdsscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config cmds 1`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set CommandBlocksEnabled §6as enabled!"}]}`);
    } else if (cmdsscore === 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config cmds 2`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set CommandBlocksEnabled §4as disabled!"}]}`);
    } else if (cmdsscore >= 2) {
        // Force
        player.runCommand(`scoreboard players set paradox:config cmds 0`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has §etoggled§r Force-CommandBlocksEnabled!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a cmds = paradox:config cmds`);
}
