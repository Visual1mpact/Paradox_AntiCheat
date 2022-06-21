import { crypto, disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";
import { ReachC } from "../../penrose/entityhitevent/reach_c.js";

const World = world;

function reachCHelp(player, prefix, reachCBoolean) {
    let commandStatus;
    if (!config.customcommands.reachc) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (reachCBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: reachc
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: reachc [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles checks for player's attacking beyond reach.
§4[§6Examples§4]§r:
    ${prefix}reachc
    ${prefix}reachc help
"}]}`);
}

/**
 * @name reachC
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function reachC(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/reachc.js:5)");
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
    let reachCBoolean = World.getDynamicProperty('reachc_b');
    if (reachCBoolean === undefined) {
        reachCBoolean = config.modules.reachC.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.reachc) {
        return reachCHelp(player, prefix, reachCBoolean);
    }

    if (reachCBoolean === false) {
        // Allow
        World.setDynamicProperty('reachc_b', true);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6ReachC§r!"}]}`);
        ReachC();
        return;
    } else if (reachCBoolean === true) {
        // Deny
        World.setDynamicProperty('reachc_b', false);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4ReachC§r!"}]}`);
        return;
    }
}
