import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";

const World = world;

function rbcrHelp(player, prefix, rcbrBoolean) {
    let commandStatus;
    if (!config.customcommands.rbcr) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (rcbrBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `§4[§6Command§4]§r: rbcr`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: rbcr [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles option to use Realm Bot Chat Relay.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}rbcr`,
        `    ${prefix}rbcr help`,
    ])
}

/**
 * @name rbcr
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function rbcr(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/rbcr.js:32)");
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
    let rcbrBoolean = World.getDynamicProperty('rcbr_b');
    if (rcbrBoolean === undefined) {
        rcbrBoolean = config.modules.rbcr.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.reacha) {
        return rbcrHelp(player, prefix, rcbrBoolean);
    }

    if (rcbrBoolean === false) {
        // Allow
        World.setDynamicProperty('rcbr_b', true);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Realm Bot Chat Relay§r!`)
        return;
    } else if (rcbrBoolean === true) {
        // Deny
        World.setDynamicProperty('rcbr_b', false);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Realm Bot Chat Relay§r!`)
        return;
    }
}
