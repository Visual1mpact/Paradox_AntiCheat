import { crypto, disabler, getPrefix } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";

const World = world;

function illegalItemsDHelp(player, prefix, illegalItemsDBoolean) {
    let commandStatus;
    if (!config.customcommands.illegalitemsd) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (illegalItemsDBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: illegalitemsd
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: illegalitemsd [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles checks for illegal dropped items.
§4[§6Examples§4]§r:
    ${prefix}illegalitemsd
    ${prefix}illegalitemsd help
"}]}`);
}

/**
 * @name illegalitemsD
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function illegalitemsD(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/illegalitemsd.js:6)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Get Dynamic Property Boolean
    let illegalItemsDBoolean = World.getDynamicProperty('illegalitemsd_b');
    if (illegalItemsDBoolean === undefined) {
        illegalItemsDBoolean = config.modules.illegalitemsD.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.illegalitemsd) {
        return illegalItemsDHelp(player, prefix, illegalItemsDBoolean);
    }

    if (illegalItemsDBoolean === false) {
        // Allow
        World.setDynamicProperty('illegalitemsd_b', true);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6IllegalItemsD§r!"}]}`);
        return;
    } else if (illegalItemsDBoolean === true) {
        // Deny
        World.setDynamicProperty('illegalitemsd_b', false);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4IllegalItemsD§r!"}]}`);
        return;
    }
}
