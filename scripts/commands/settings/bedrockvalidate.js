import config from "../../data/config.js";
import { disabler } from "../../util.js";

/**
 * @name bedrockvalidate
 * @param {object} message - Message object
 */
export function bedrockvalidate(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/bedrockValidate.js:7)");
    }

    let player = message.sender;

    message.cancel = true;

    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (config.modules.bedrockValidate.enabled === false) {
        // Allow
        config.modules.bedrockValidate.enabled = true;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6BedrockValidate!"}]}`);
    } else if (config.modules.bedrockValidate.enabled === true) {
        // Deny
        config.modules.bedrockValidate.enabled = false;
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4BedrockValidate!"}]}`);
    }
}
