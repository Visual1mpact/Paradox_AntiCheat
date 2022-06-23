import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";
import { SpammerA } from "../../penrose/beforechatevent/spammer/spammer_a.js";

const World = world;

function spammerAHelp(player, prefix, spammerABoolean) {
    let commandStatus;
    if (!config.customcommands.spammera) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (spammerABoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `§4[§6Command§4]§r: spammera`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: spammera [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for messages sent while moving.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}spammera`,
        `    ${prefix}spammera help`,
    ])
}

/**
 * @name spammerA
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function spammerA(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/spammera.js:5)");
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
    let spammerABoolean = World.getDynamicProperty('spammera_b');
    if (spammerABoolean === undefined) {
        spammerABoolean = config.modules.spammerA.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.spammera) {
        return spammerAHelp(player, prefix, spammerABoolean);
    }

    if (spammerABoolean === false) {
        // Allow
        World.setDynamicProperty('spammera_b', true);
        sendMsgToPlayer('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6SpammerA§r!`)
        SpammerA();
        return;
    } else if (spammerABoolean === true) {
        // Deny
        World.setDynamicProperty('spammera_b', false);
        sendMsgToPlayer('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4SpammerA§r!`)
        return;
    }
}
