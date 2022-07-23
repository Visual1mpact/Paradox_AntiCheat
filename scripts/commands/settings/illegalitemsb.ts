import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "mojang-minecraft";
import { IllegalItemsB } from "../../penrose/beforeitemuseonevent/illegalitems/illegalitems_b.js";

const World = world;

function illegalItemsBHelp(player: Player, prefix: string, illegalItemsBBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.illegalitemsb) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (illegalItemsBBoolean) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: illegalitemsb`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: illegalitemsb [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for player's that use illegal items.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}illegalitemsb`,
        `    ${prefix}illegalitemsb help`,
    ]);
}

/**
 * @name illegalitemsB
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function illegalitemsB(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/illegalitemsb.js:36)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    let illegalItemsBBoolean = World.getDynamicProperty('illegalitemsb_b');
    if (illegalItemsBBoolean === undefined) {
        illegalItemsBBoolean = config.modules.illegalitemsB.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.illegalitemsb) {
        return illegalItemsBHelp(player, prefix, illegalItemsBBoolean);
    }

    if (illegalItemsBBoolean === false) {
        // Allow
        World.setDynamicProperty('illegalitemsb_b', true);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6IllegalItemsB§r!`);
        IllegalItemsB();
        return;
    } else if (illegalItemsBBoolean === true) {
        // Deny
        World.setDynamicProperty('illegalitemsb_b', false);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4IllegalItemsB§r!`);
        return;
    }
}
