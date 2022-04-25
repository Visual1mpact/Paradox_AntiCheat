/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { EntityQueryOptions, world } from "mojang-minecraft";
import config from "../../data/config.js";
import { disabler } from "../../util.js";

const World = world;

/**
 * @name lockdown
 * @param {object} message - Message object
 */
export function lockdown(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/lockdown.js:10)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // If already locked down then unlock the server
    if (config.modules.lockDown.enabled) {
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Server is no longer in lockdown!"}]}`);
        return config.modules.lockDown.enabled = false;
    }

    // Default reason for locking it down
    let reason = "Under Maintenance! Sorry for the inconvenience.";
    
    // Get players that are not Paradox-Opped
    let filter = new EntityQueryOptions();
    filter.excludeTags = ['paradoxOpped', 'TestPlayer'];

    // Lock it down
    for (let pl of World.getPlayers(filter)) {
        try {
            // Kick players from server
            pl.runCommand(`kick "${disabler(pl.nameTag)}" ${reason}`);
        } catch (error) {
            // Despawn players from server
            pl.triggerEvent('paradox:kick');
        }
    }
    // Shutting it down
    player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Server is in lockdown!"}]}`);
    return config.modules.lockDown.enabled = true;
}
