import { crypto, disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";

const World = world;

function illegalLoresHelp(player, prefix, illegalLoresBoolean) {
    let commandStatus;
    if (!config.customcommands.illegallores) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (illegalLoresBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: illegallores
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: illegallores [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles checks for illegal Lores on items.
§4[§6Examples§4]§r:
    ${prefix}illegallores
    ${prefix}illegallores help
"}]}`);
}

/**
 * @name illegalLores
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function illegalLores(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/illegalLores.js:6)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Get Dynamic Property Boolean
    let illegalLoresBoolean = World.getDynamicProperty('illegallores_b');
    if (illegalLoresBoolean === undefined) {
        illegalLoresBoolean = config.modules.illegalLores.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.illegallores) {
        return illegalLoresHelp(player, prefix, illegalLoresBoolean);
    }

    if (illegalLoresBoolean === false) {
        // Allow
        World.setDynamicProperty('illegallores_b', true);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6IllegalLores§r!"}]}`);
        return;
    } else if (illegalLoresBoolean === true) {
        // Deny
        World.setDynamicProperty('illegallores_b', false);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4IllegalLores§r!"}]}`);
        return;
    }
}
