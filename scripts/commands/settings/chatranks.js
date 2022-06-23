import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";

const World = world;

function chatRanksHelp(player, prefix, chatRanksBoolean) {
    let commandStatus;
    if (!config.customcommands.chatranks) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (chatRanksBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `§4[§6Command§4]§r: chatranks`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: chatranks [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles chat ranks.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}chatranks`,
        `    ${prefix}chatranks help`,
    ])
}

/**
 * @name chatranks
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function chatranks(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/chatranks.js:7)");
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
    let chatRanksBoolean = World.getDynamicProperty('chatranks_b');
    if (chatRanksBoolean === undefined) {
        chatRanksBoolean = config.modules.chatranks.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.chatranks) {
        return chatRanksHelp(player, prefix, chatRanksBoolean);
    }

    if (chatRanksBoolean === false) {
        // Allow
        World.setDynamicProperty('chatranks_b', true);
        /*
        for (let pl of world.getPlayers()) {
            const dimension = pl.dimension;
            Restore their custom nametag
            tagRank(pl);
            This refreshes the nameTag in the World for everyone online
            pl.teleport(new Location(pl.location.x, pl.location.y, pl.location.z), dimension, 0, 0);
        }
        */
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6ChatRanks§r!`)
        return;
    } else if (chatRanksBoolean === true) {
        // Deny
        World.setDynamicProperty('chatranks_b', false);
        /*
        for (let pl of world.getPlayers()) {
            const dimension = pl.dimension;
            Reset their nametag to its original name
            pl.nameTag = pl.name;
            This refreshes the nameTag in the World for everyone online
            pl.teleport(new Location(pl.location.x, pl.location.y, pl.location.z), dimension, 0, 0);
        }
        */
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4ChatRanks§r!`)
        return;
    }
}
