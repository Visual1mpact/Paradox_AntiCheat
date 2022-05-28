import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

function hotbarHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.hotbar) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    let moduleStatus;
    if (!config.modules.hotbar.enabled) {
        moduleStatus = "§6[§4DISABLED§6]§r"
    } else {
        moduleStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: hotbar
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: hotbar [optional]
§4[§6Optional§4]§r: message, help
§4[§6Description§4]§r: Displays a hotbar message for all player's currently online.
§4[§6Examples§4]§r:
    ${prefix}hotbar Anarchy Server | Anti 32k | Realm Code: 34fhf843
    ${prefix}hotbar help
"}]}`)
}

/**
 * @name hotbar
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function hotbar(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/hotbar.js:5)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.hotbar) {
        return hotbarHelp(player, prefix);
    }

    if (config.modules.hotbar.enabled === false) {
        // Allow
        config.modules.hotbar.enabled = true;
        if (args.length >= 1) {
            config.modules.hotbar.message = args.join(" ");
        }
        return player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Hotbar!"}]}`);
    } else if (config.modules.hotbar.enabled === true) {
        // Deny
        config.modules.hotbar.enabled = false;
        return player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Hotbar!"}]}`);
    }
}
