import config from "../../data/config.js";
import { disabler } from "../../util.js";

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
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (config.modules.adventureGM.enabled === false) {
        // Allow
        config.modules.adventureGM.enabled = true;
        // Make sure at least one is allowed since this could cause serious issues if all were locked down
        // We will allow Adventure Mode in this case
        if (config.modules.survivalGM.enabled === true && config.modules.creativeGM.enabled === true) {
            config.modules.adventureGM.enabled = false;
            return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r Since all gamemodes were disallowed, Adventure mode has been enabled."}]}`);
        }
        return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disallowed §4Gamemode 2 (Adventure)§r to be used!"}]}`);
    } else if (config.modules.adventureGM.enabled === true) {
        // Deny
        config.modules.adventureGM.enabled = false;
        return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has allowed §6Gamemode 2 (Adventure)§r to be used!"}]}`);
    }
}
