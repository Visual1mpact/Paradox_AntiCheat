import { disabler } from "../../util.js";

/**
 * @name performance
 * @param {object} message - Message object
 */
export function performance(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/performance.js:5)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (!player.hasTag('performance')) {
        // Allow
        player.addTag('performance');
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r You have enabled §6Performance Testing§r!"}]}`);
        return;
    } else if (player.hasTag('performance')) {
        // Deny
        player.removeTag('performance');
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r You have disabled §4Performance Testing§r!"}]}`);
        return;
    }
}
