import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { Hotbar } from "../../penrose/tickevent/hotbar/hotbar.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function hotbarHelp(player, prefix, hotbarBoolean) {
    let commandStatus;
    if (!config.customcommands.hotbar) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (hotbarBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: hotbar`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: hotbar [optional]`,
        `§4[§6Optional§4]§r: message, help`,
        `§4[§6Description§4]§r: Displays a hotbar message for all player's currently online.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}hotbar Anarchy Server | Anti 32k | Realm Code: 34fhf843`,
        `    ${prefix}hotbar help`,
    ])
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
    
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    let hotbarBoolean = World.getDynamicProperty('hotbar_b');
    if (hotbarBoolean === undefined) {
        hotbarBoolean = config.modules.hotbar.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.hotbar) {
        return hotbarHelp(player, prefix, hotbarBoolean);
    }

    if (hotbarBoolean === false) {
        // Allow
        World.setDynamicProperty('hotbar_b', true);
        if (args.length >= 1) {
            config.modules.hotbar.message = args.join(" ");
        }
        sendMsg('@a[tag=paradoxOpped]', `${player.nameTag} has enabled §6Hotbar`)
        Hotbar();
        return;
    } else if (hotbarBoolean === true) {
        // Deny
        World.setDynamicProperty('hotbar_b', false);
        sendMsg('@a[tag=paradoxOpped]', `${player.nameTag} has disabled §6Hotbar`)
    }
}
