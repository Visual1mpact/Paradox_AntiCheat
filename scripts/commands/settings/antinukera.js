import { crypto, disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";

const World = world;

function antinukeraHelp(player, prefix, antiNukerABoolean) {
    let commandStatus;
    if (!config.customcommands.antinukera) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (antiNukerABoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: antinukera
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: antinukera [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Checks player's for nuking blocks.
§4[§6Examples§4]§r:
    ${prefix}antinukera
    ${prefix}antinukera help
"}]}`);
}

/**
 * @name antinukerA
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function antinukerA(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/antinukera.js:5)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Get Dynamic Property Boolean
    let antiNukerABoolean = World.getDynamicProperty('antinukera_b');
    if (antiNukerABoolean === undefined) {
        antiNukerABoolean = config.modules.antinukerA.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.antinukera) {
        return antinukeraHelp(player, prefix, antiNukerABoolean);
    }

    if (antiNukerABoolean === false) {
        // Allow
        World.setDynamicProperty('antinukera_b', true);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6AntiNukerA§r!"}]}`);
        return;
    } else if (antiNukerABoolean === true) {
        // Deny
        World.setDynamicProperty('antinukera_b', false);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4AntiNukerA§r!"}]}`);
        return;
    }
}
