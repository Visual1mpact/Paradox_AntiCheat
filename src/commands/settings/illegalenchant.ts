import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";

const World = world;

function illegalEnchantHelp(player: Player, prefix: string, illegalEnchantmentBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.illegalenchant) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (illegalEnchantmentBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: illegalenchant`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: illegalenchant [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for items with illegal enchantments.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}illegalenchant`,
        `    ${prefix}illegalenchant help`,
    ]);
}

/**
 * @name illegalEnchant
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function illegalEnchant(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/illegalenchant.js:35)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const illegalEnchantmentBoolean = dynamicPropertyRegistry.get("illegalenchantment_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.illegalenchant) {
        return illegalEnchantHelp(player, prefix, illegalEnchantmentBoolean);
    }

    if (illegalEnchantmentBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("illegalenchantment_b", true);
        World.setDynamicProperty("illegalenchantment_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6IllegalEnchantments§r!`);
    } else if (illegalEnchantmentBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("illegalenchantment_b", false);
        World.setDynamicProperty("illegalenchantment_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4IllegalEnchantments§r!`);
    }
}
