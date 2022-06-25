import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { world } from "mojang-minecraft";
import { OPS } from "../../penrose/tickevent/oneplayersleep/oneplayersleep.js";

const World = world;

function opsHelp(player, prefix, opsBoolean) {
    let commandStatus;
    if (!config.customcommands.ops) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (opsBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: ops`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: ops [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles One Player Sleep (OPS) for all online players.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}ops`,
        `    ${prefix}ops help`,
    ]);
}

/**
 * @name ops
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function ops(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/oneplayersleep.js:32)");
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
    let opsBoolean = World.getDynamicProperty('ops_b');
    if (opsBoolean === undefined) {
        opsBoolean = config.modules.ops.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.ops) {
        return opsHelp(player, prefix, opsBoolean);
    }

    if (opsBoolean === false) {
        // Allow
        World.setDynamicProperty('ops_b', true);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6OPS§r!`);
        OPS();
        return;
    } else if (opsBoolean === true) {
        // Deny
        World.setDynamicProperty('ops_b', false);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4OPS§r!`);
        return;
    }
}
