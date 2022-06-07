import { crypto, disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";

const World = world;

function flyaHelp(player, prefix, flyABoolean) {
    let commandStatus;
    if (!config.customcommands.flya) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (flyABoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: flya
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: flya [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles checks for illegal flying in survival.
§4[§6Examples§4]§r:
    ${prefix}flya
    ${prefix}flya help
"}]}`);
}

/**
 * @name flyA
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function flyA(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/flya.js:5)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Get Dynamic Property Boolean
    let flyABoolean = World.getDynamicProperty('flya_b');
    if (flyABoolean === undefined) {
        flyABoolean = config.modules.flyA.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.flya) {
        return flyaHelp(player, prefix, flyABoolean);
    }

    if (flyABoolean === false) {
        // Allow
        World.setDynamicProperty('flya_b', true);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6FlyA§r!"}]}`);
        return;
    } else if (flyABoolean === true) {
        // Deny
        World.setDynamicProperty('flya_b', false);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4FlyA§r!"}]}`);
        return;
    }
}
