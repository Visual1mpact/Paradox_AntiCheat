import { disabler } from "../../util.js";
import config from "../../data/config.js";
import { world, Location } from "mojang-minecraft";

/**
 * @name chatranks
 * @param {object} message - Message object
 */
export function chatranks(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/chatranks.js:7)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (config.modules.chatranks.enabled === false) {
        // Allow
        config.modules.chatranks.enabled = true;
        for (let pl of world.getPlayers()) {
            const dimension = pl.dimension;
            // This refreshes the nameTag in the World for everyone online
            pl.teleport(new Location(pl.location.x, pl.location.y, pl.location.z), dimension, 0, pl.bodyRotation);
        }
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6ChatRanks§r!"}]}`);
        return;
    } else if (config.modules.chatranks.enabled === true) {
        // Deny
        config.modules.chatranks.enabled = false;
        for (let pl of world.getPlayers()) {
            const dimension = pl.dimension;
            // This refreshes the nameTag in the World for everyone online
            pl.teleport(new Location(pl.location.x, pl.location.y, pl.location.z), dimension, 0, pl.bodyRotation);
        }
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4ChatRanks§r!"}]}`);
        return;
    }
}
