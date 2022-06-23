import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";

const World = world;

function stackBanHelp(player, prefix, stackBanBoolean) {
    let commandStatus;
    if (!config.customcommands.stackban) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (stackBanBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `§4[§6Command§4]§r: stackban`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: stackban [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for player's with illegal stacks over 64.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}stackban`,
        `    ${prefix}stackban help`,
    ])
}

/**
 * @name stackban
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function stackban(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/stackban.js:6)");
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
    let stackBanBoolean = World.getDynamicProperty('stackban_b');
    if (stackBanBoolean === undefined) {
        stackBanBoolean = config.modules.stackBan.enabled;
    }
    let illegalItemsABoolean = World.getDynamicProperty('illegalitemsa_b');
    if (illegalItemsABoolean === undefined) {
        illegalItemsABoolean = config.modules.illegalitemsA.enabled;
    }
    let illegalItemsBBoolean = World.getDynamicProperty('illegalitemsb_b');
    if (illegalItemsBBoolean === undefined) {
        illegalItemsBBoolean = config.modules.illegalitemsB.enabled;
    }
    let illegalItemsCBoolean = World.getDynamicProperty('illegalitemsc_b');
    if (illegalItemsCBoolean === undefined) {
        illegalItemsCBoolean = config.modules.illegalitemsC.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.stackban) {
        return stackBanHelp(player, prefix, stackBanBoolean);
    }

    if (!illegalItemsABoolean && !illegalItemsBBoolean && !illegalItemsCBoolean) {
        if (stackBanBoolean) {
            // In this stage they are likely turning it off so oblige their request
            return World.setDynamicProperty('stackban_b', false);
        }
        // If illegal items are not enabled then let user know this feature is inaccessible
        // It will not work without one of them
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to enable Illegal Items to use this feature.`)
    }

    if (stackBanBoolean === false) {
        // Allow
        World.setDynamicProperty('stackban_b', true);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6StackBans§r!`)
        return;
    } else if (stackBanBoolean === true) {
        // Deny
        World.setDynamicProperty('stackban_b', false);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4StackBans§r!`)
        return;
    }
}
