import { disabler } from "../../util.js";
import config from "../../data/config.js";

/**
 * @name placeflagsA
 * @param {object} message - Message object
 */
export function placeflagsA(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/placeflagsa.js:5)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (config.modules.placeflagsA.enabled === false) {
        // Allow
        config.modules.placeflagsA.enabled = true;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6PlaceFlagsA§r!"}]}`);
        return;
    } else if (config.modules.placeflagsA.enabled === true) {
        // Deny
        config.modules.placeflagsA.enabled = false;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4PlaceFlagsA§r!"}]}`);
        return;
    }
}
