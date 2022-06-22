import { crypto, disabler, getPrefix, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";
import { BadPackets2 } from "../../penrose/tickevent/badpackets2/badpackets2.js";

const World = world;

function badpackets2Help(player, prefix, badPackets2Boolean) {
    let commandStatus;
    if (!config.customcommands.badpackets2) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (badPackets2Boolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `§4[§6Command§4]§r: badpackets2`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: badpackets2 [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for invalid selected slots by player.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}badpackets2`,
        `    ${prefix}badpackets2 help`,
    ])
}

/**
 * @name badpackets2
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function badpackets2(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/badpackets2.js:5)");
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
    let badPackets2Boolean = World.getDynamicProperty('badpackets2_b');
    if (badPackets2Boolean === undefined) {
        badPackets2Boolean = config.modules.badpackets2.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.badpackets2) {
        return badpackets2Help(player, prefix, badPackets2Boolean);
    }

    if (badPackets2Boolean === false) {
        // Allow
        World.setDynamicProperty('badpackets2_b', true);
        sendMsgToPlayer('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Badpackets2§r!`)
        BadPackets2();
        return;
    } else if (badPackets2Boolean === true) {
        // Deny
        World.setDynamicProperty('badpackets2_b', false);
        sendMsgToPlayer('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Badpackets2§r!`)
        return;
    }
}
