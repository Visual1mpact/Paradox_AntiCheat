import { disabler } from "../../util.js";
import config from "../../data/config.js";

/**
 * @name invalidsprintA
 * @param {object} message - Message object
 */
export function invalidsprintA(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/invaidsprinta.js:5)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (config.modules.invalidsprintA.enabled === false) {
        // Allow
        config.modules.invalidsprintA.enabled = true;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6InvalidSprintA§r!"}]}`);
        return;
    } else if (config.modules.invalidsprintA.enabled === true) {
        // Deny
        config.modules.invalidsprintA.enabled = false;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4InvalidSprintA§r!"}]}`);
        return;
    }
}
