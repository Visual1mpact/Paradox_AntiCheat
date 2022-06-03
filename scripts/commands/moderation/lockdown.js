/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { EntityQueryOptions, world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function lockdownHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.lockdown) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (!config.modules.lockDown.enabled) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: lockdown
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: lockdown [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Kicks player's from server excluding Staff for maintenance.
§4[§6Examples§4]§r:
    ${prefix}lockdown
    ${prefix}lockdown help
"}]}`);
}

/**
 * @name lockdown
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function lockdown(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/lockdown.js:10)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.lockdown) {
        return lockdownHelp(player, prefix);
    }

    // If already locked down then unlock the server
    if (config.modules.lockDown.enabled) {
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Server is no longer in lockdown!"}]}`);
        return config.modules.lockDown.enabled = false;
    }

    // Default reason for locking it down
    let reason = "Under Maintenance! Sorry for the inconvenience.";
    
    // Get players that are not Paradox-Opped
    let filter = new EntityQueryOptions();
    filter.excludeTags = ['Hash:' + crypto];

    // Lock it down
    for (let pl of World.getPlayers(filter)) {
        try {
            // Kick players from server
            pl.runCommand(`lockdown "${disabler(pl.nameTag)}" ${reason}`);
        } catch (error) {
            // Despawn players from server
            pl.triggerEvent('paradox:lockdown');
        }
    }
    // Shutting it down
    player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Server is in lockdown!"}]}`);
    return config.modules.lockDown.enabled = true;
}
