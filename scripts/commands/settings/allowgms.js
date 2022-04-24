import config from "../../data/config.js";
import { disabler } from "../../util.js";

/**
 * @name allowgms
 * @param {object} message - Message object
 */
export function allowgms(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/allowGMS.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (config.modules.survivalGM.enabled === false) {
        // Allow
        config.modules.survivalGM.enabled = true;
        // Make sure at least one is allowed since this could cause serious issues if all were locked down
        // We will allow Adventure Mode in this case
        if (config.modules.adventureGM.enabled === true && config.modules.creativeGM.enabled === true) {
            config.modules.adventureGM.enabled = false;
            return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r Since all gamemodes were disallowed, Adventure mode has been enabled."}]}`);
        }
        return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disallowed §4Gamemode 0 (Survival)§r to be used!"}]}`);
    } else if (config.modules.survivalGM.enabled === true) {
        // Deny
        config.modules.survivalGM.enabled = false;
        return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has allowed §6Gamemode 0 (Survival)§r to be used!"}]}`);
    }
}
