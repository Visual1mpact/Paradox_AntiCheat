import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function worldBorderHelp(player, prefix, worldBorderBoolean) {
    let commandStatus;
    if (!config.customcommands.worldborder) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (worldBorderBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: worldborder
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: worldborder <value> [optional]
§4[§6Optional§4]§r: disable, help
§4[§6Description§4]§r: Sets the world border and restricts players to that border.
§4[§6Examples§4]§r:
    ${prefix}worldborder 1000
    ${prefix}worldborder 25689
    ${prefix}worldborder disable
    ${prefix}worldborder help
"}]}`);
}

/**
 * @name worldborder
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function worldborders(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/worldborder.js:5)");
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
    let worldBorderBoolean = World.getDynamicProperty('worldborder_b');
    if (worldBorderBoolean === undefined) {
        worldBorderBoolean = config.modules.worldBorder.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.worldborder) {
        return worldBorderHelp(player, prefix, worldBorderBoolean);
    }


    if (argCheck !== "disable" && isNaN(argCheck) === false) {
        // Build the wall
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border§r to ${argCheck}!"}]}`);
        World.setDynamicProperty('worldborder_b', true);
        World.setDynamicProperty('worldborder_n', Math.abs(argCheck));
        return
    } else if (argCheck === "disable") {
        // Disable Worldborder
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled the §6World Border§r!"}]}`);
        World.setDynamicProperty('worldborder_b', false);
        World.setDynamicProperty('worldborder_n', 0);
        return;
    } else {
        return worldBorderHelp(player, prefix);
    }
}
