import config from "../../data/config.js";
import { disabler, getScore } from "../../util.js";

/**
 * @name hotbar
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function hotbar(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/hotbar.js:5)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    let hotbarScore = getScore("hotbar", player);

    if (hotbarScore <= 0) {
        // Allow
        config.modules.hotbar.enabled = true;
        if (args.length >= 1) {
            config.modules.hotbar.message = args.join(" ");
        }
        player.runCommand(`scoreboard players set paradox:config hotbar 1`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Hotbar!"}]}`);
    } else if (hotbarScore >= 1) {
        // Deny
        config.modules.hotbar.enabled = false;
        player.runCommand(`scoreboard players set paradox:config hotbar 0`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Hotbar!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a hotbar = paradox:config hotbar`);
}
