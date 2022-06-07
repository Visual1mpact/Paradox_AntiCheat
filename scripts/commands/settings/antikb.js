import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix, getScore } from "../../util.js";

const World = world;

function antikbHelp(player, prefix, antikbBoolean) {
    let commandStatus;
    if (!config.customcommands.antikb) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (antikbBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: antikb
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: antikb [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles Anti Knockback for all players.
§4[§6Examples§4]§r:
    ${prefix}antikb
    ${prefix}antikb help
"}]}`);
}

/**
 * @name antiknockback
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function antiknockback(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/antikb.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Get Dynamic Property Boolean
    let antikbBoolean = World.getDynamicProperty('antikb_b');
    if (antikbBoolean === undefined) {
        noSlowBoolean = config.modules.antikbA.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.antikb) {
        return antikbHelp(player, prefix, antikbBoolean);
    }

    let antikbscore = getScore("antikb", player);

    if (antikbscore <= 0) {
        // Allow
        World.setDynamicProperty('antikb_b', true);
        player.runCommand(`scoreboard players set paradox:config antikb 1`);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Anti Knockback§r!"}]}`);
    } else if (antikbscore >= 1) {
        // Deny
        World.setDynamicProperty('antikb_b', false);
        player.runCommand(`scoreboard players set paradox:config antikb 0`);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Anti Knockback§r!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a antikb = paradox:config antikb`);
}
