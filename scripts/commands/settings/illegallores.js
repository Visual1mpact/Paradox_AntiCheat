import { disabler } from "../../util.js";
import config from "../../data/config.js";

/**
 * @name illegalLores
 * @param {object} message - Message object
 */
export function illegalLores(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/illegalLores.js:6)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (config.modules.illegalLores.enabled === false) {
        // Allow
        config.modules.illegalLores.enabled = true;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6IllegalLores§r!"}]}`);
        return;
    } else if (config.modules.illegalLores.enabled === true) {
        // Deny
        config.modules.illegalLores.enabled = false;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4IllegalLoresD§r!"}]}`);
        return;
    }
}
