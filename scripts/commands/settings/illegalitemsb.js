import { disabler } from "../../util.js";
import config from "../../data/config.js";

/**
 * @name illegalitemsB
 * @param {object} message - Message object
 */
export function illegalitemsB(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/illegalitemsb.js:5)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (config.modules.illegalitemsB.enabled === false) {
        // Allow
        config.modules.illegalitemsB.enabled = true;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6IllegalItemsB§r!"}]}`);
        return;
    } else if (config.modules.illegalitemsB.enabled === true) {
        // Deny
        config.modules.illegalitemsB.enabled = false;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4IllegalItemsB§r!"}]}`);
        return;
    }
}
