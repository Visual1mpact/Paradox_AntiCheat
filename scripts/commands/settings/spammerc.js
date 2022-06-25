import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";
import { SpammerC } from "../../penrose/beforechatevent/spammer/spammer_c.js";

const World = world;

function spammerCHelp(player, prefix, spammerCBoolean) {
    let commandStatus;
    if (!config.customcommands.spammerc) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (spammerCBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: spammerc`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: spammerc [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for messages sent while using items.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}spammerc`,
        `    ${prefix}spammerc help`,
    ]);
}

/**
 * @name spammerC
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function spammerC(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/spammerC.js:5)");
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
    let spammerCBoolean = World.getDynamicProperty('spammerc_b');
    if (spammerCBoolean === undefined) {
        spammerCBoolean = config.modules.spammerC.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.spammerc) {
        return spammerCHelp(player, prefix);
    }

    if (spammerCBoolean === false) {
        // Allow
        World.setDynamicProperty('spammerc_b', true);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6SpammerC§r!`);
        SpammerC();
        return;
    } else if (spammerCBoolean === true) {
        // Deny
        World.setDynamicProperty('spammerc_b', false);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4SpammerC§r!`);
        return;
    }
}
