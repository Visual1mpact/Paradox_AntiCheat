import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "mojang-minecraft";

const World = world;

function salvageHelp(player: Player, prefix: string, salvageBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.salvage) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (salvageBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: salvage`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: salvage [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles new salvage system [Experimental].`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}salvage`,
        `    ${prefix}salvage help`,
    ]);
}

/**
 * @name salvage
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function salvage(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/salvage.js:35)");
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
    let salvageBoolean = World.getDynamicProperty("salvage_b");
    if (salvageBoolean === undefined) {
        salvageBoolean = config.modules.salvage.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.salvage) {
        return salvageHelp(player, prefix, salvageBoolean);
    }

    if (salvageBoolean === false) {
        // Allow
        World.setDynamicProperty("salvage_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Salvage§r!`);
        return;
    } else if (salvageBoolean === true) {
        // Deny
        World.setDynamicProperty("salvage_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Salvage§r!`);
        return;
    }
}
