import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";
import { IllegalItemsC } from "../../penrose/blockplaceevent/illegalitems/illegalitems_c.js";

const World = world;

function illegalItemsCHelp(player, prefix, illegalItemsCBoolean) {
    let commandStatus;
    if (!config.customcommands.illegalitemsc) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (illegalItemsCBoolean) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `§4[§6Command§4]§r: illegalitemsc`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: illegalitemsc [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for player's that place illegal items.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}illegalitemsc`,
        `    ${prefix}illegalitemsc help`,
    ])
}

/**
 * @name illegalitemsC
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function illegalitemsC(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/illegalitemsc.js:5)");
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
    let illegalItemsCBoolean = World.getDynamicProperty('illegalitemsc_b');
    if (illegalItemsCBoolean === undefined) {
        illegalItemsCBoolean = config.modules.illegalitemsC.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.illegalitemsc) {
        return illegalItemsCHelp(player, prefix, illegalItemsCBoolean);
    }

    if (illegalItemsCBoolean === false) {
        // Allow
        World.setDynamicProperty('illegalitemsc_b', true);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6IllegalItemsC§r!`)
        IllegalItemsC();
        return;
    } else if (illegalItemsCBoolean === true) {
        // Deny
        World.setDynamicProperty('illegalitemsc_b', false);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4IllegalItemsC§r!`)
        return;
    }
}
