import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function allowgmcHelp(player, prefix, creativeGMBoolean) {
    let commandStatus;
    if (!config.customcommands.allowgmc) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (creativeGMBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: allowgmc
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: allowgmc [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles Gamemode 1 (Creative) to be used.
§4[§6Examples§4]§r:
    ${prefix}allowgmc
    ${prefix}allowgmc help
"}]}`);
}

/**
 * @name allowgmc
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function allowgmc(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/allowGMC.js:7)");
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
    let adventureGMBoolean = World.getDynamicProperty('adventuregm_b');
    if (adventureGMBoolean === undefined) {
        adventureGMBoolean = config.modules.adventureGM.enabled;
    }
    let creativeGMBoolean = World.getDynamicProperty('creativegm_b');
    if (creativeGMBoolean === undefined) {
        creativeGMBoolean = config.modules.creativeGM.enabled;
    }
    let survivalGMBoolean = World.getDynamicProperty('survivalgm_b');
    if (survivalGMBoolean === undefined) {
        survivalGMBoolean = config.modules.survivalGM.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.allowgmc) {
        return allowgmcHelp(player, prefix, creativeGMBoolean);
    }

    if (creativeGMBoolean === false) {
        // Allow
        World.setDynamicProperty('creativegm_b', true);
        // Make sure at least one is allowed since this could cause serious issues if all were locked down
        // We will allow Adventure Mode in this case
        if (adventureGMBoolean === true && survivalGMBoolean === true) {
            World.setDynamicProperty('adventuregm_b', false);
            return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r Since all gamemodes were disallowed, Adventure mode has been enabled."}]}`);
        }
        return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disallowed §4Gamemode 1 (Creative)§r to be used!"}]}`);
    } else if (creativeGMBoolean === true) {
        // Deny
        World.setDynamicProperty('creativegm_b', false);
        return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has allowed §6Gamemode 1 (Creative)§r to be used!"}]}`);
    }
}
