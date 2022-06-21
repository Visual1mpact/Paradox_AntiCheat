import { crypto, disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";

const World = world;

function reachAHelp(player, prefix, reachABoolean) {
    let commandStatus;
    if (!config.customcommands.reacha) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (reachABoolean) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: reacha
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: reacha [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles checks for player's placing blocks beyond reach.
§4[§6Examples§4]§r:
    ${prefix}reacha
    ${prefix}reacha help
"}]}`);
}

/**
 * @name reachA
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function reachA(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/reacha.js:5)");
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
    let reachABoolean = World.getDynamicProperty('reacha_b');
    if (reachABoolean === undefined) {
        reachABoolean = config.modules.reachA.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.reacha) {
        return reachAHelp(player, prefix, reachABoolean);
    }

    if (reachABoolean === false) {
        // Allow
        World.setDynamicProperty('reacha_b', true);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6ReachA§r!"}]}`);
        return;
    } else if (reachABoolean === true) {
        // Deny
        World.setDynamicProperty('reacha_b', false);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4ReachA§r!"}]}`);
        return;
    }
}
