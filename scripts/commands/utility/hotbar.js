import config from "../../data/config.js";
import { disabler, getScore, getPrefix } from "../../util.js";

function hotbarHelp(player, prefix, hotbarScore) {
    let commandStatus;
    if (!config.customcommands.hotbar) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    let moduleStatus;
    if (hotbarScore <= 0) {
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
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    let hotbarScore = getScore("hotbar", player);

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.hotbar) {
        return hotbarHelp(player, prefix, hotbarScore);
    }

    if (hotbarScore <= 0) {
        // Allow
        config.modules.hotbar.enabled = true;
        if (args.length >= 1) {
            config.modules.hotbar.message = args.join(" ");
        }
        player.runCommand(`scoreboard players set paradox:config hotbar 1`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6Hotbar!"}]}`);
    } else if (hotbarScore >= 1) {
        // Deny
        config.modules.hotbar.enabled = false;
        player.runCommand(`scoreboard players set paradox:config hotbar 0`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4Hotbar!"}]}`);
    }
    return player.runCommand(`scoreboard players operation @a hotbar = paradox:config hotbar`);
}
