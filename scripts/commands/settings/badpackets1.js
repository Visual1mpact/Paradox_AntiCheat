import { crypto, disabler, getPrefix, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";
import { BadPackets1 } from "../../penrose/beforechatevent/spammer/badpackets_1.js";

const World = world;

function badpackets1Help(player, prefix, badPackets1Boolean) {
    let commandStatus;
    if (!config.customcommands.badpackets1) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (badPackets1Boolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `§4[§6Command§4]§r: badpackets1`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: badpackets1 [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for message lengths with each broadcast.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}badpackets1`,
        `    ${prefix}badpackets1 help`,
    ])
}

/**
 * @name badpackets1
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function badpackets1(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/badpackets1.js:5)");
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
    let badPackets1Boolean = World.getDynamicProperty('badpackets1_b');
    if (badPackets1Boolean === undefined) {
        badPackets1Boolean = config.modules.badpackets1.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.badpackets1) {
        return badpackets1Help(player, prefix, badPackets1Boolean);
    }

    if (badPackets1Boolean === false) {
        // Allow
        World.setDynamicProperty('badpackets1_b', true);
        sendMsgToPlayer('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Badpackets1§r!`)
        BadPackets1();
        return;
    } else if (badPackets1Boolean === true) {
        // Deny
        World.setDynamicProperty('badpackets1_b', false);
        sendMsgToPlayer('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Badpackets1§r!`)
        return;
    }
}
