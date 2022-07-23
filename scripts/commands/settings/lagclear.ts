import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "mojang-minecraft";
import { ClearLag } from "../../penrose/tickevent/clearlag/clearlag.js";

const World = world;

function clearlagHelp(player: Player, prefix: string, clearLagBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.clearlag) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (clearLagBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: clearlag`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: clearlag [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Clears items and entities with timer.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}clearlag`,
        `    ${prefix}clearlag help`,
    ]);
}

/**
 * @name clearlag
 * @param {BeforeChatEvent} message - Message object
 * @param {srting[]} args - Additional arguments provided (optional).
 */
export function clearlag(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/clearlag.js:36)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    let clearLagBoolean = World.getDynamicProperty("clearlag_b");
    if (clearLagBoolean === undefined) {
        clearLagBoolean = config.modules.clearLag.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.clearlag) {
        return clearlagHelp(player, prefix, clearLagBoolean);
    }

    if (clearLagBoolean === false) {
        // Allow
        World.setDynamicProperty("clearlag_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6ClearLag§r!`);
        ClearLag();
        return;
    } else if (clearLagBoolean === true) {
        // Deny
        World.setDynamicProperty("clearlag_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4ClearLag§r!`);
        return;
    }
}
