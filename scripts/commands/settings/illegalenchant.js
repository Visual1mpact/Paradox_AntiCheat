import { disabler } from "../../util.js";
import config from "../../data/config.js";

/**
 * @name illegalEnchant
 * @param {object} message - Message object
 */
export function illegalEnchant(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/illegalenchant.js:6)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (config.modules.illegalEnchantment.enabled === false) {
        // Allow
        config.modules.illegalEnchantment.enabled = true;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6IllegalEnchantments§r!"}]}`);
        return;
    } else if (config.modules.illegalEnchantment.enabled === true) {
        // Deny
        config.modules.illegalEnchantment.enabled = false;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4IllegalEnchantments§r!"}]}`);
        return;
    }
}
