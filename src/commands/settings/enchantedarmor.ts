import { BeforeChatEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { crypto, getPrefix, getScore, sendMsg, sendMsgToPlayer } from "../../util.js";

function enchantedArmorHelp(player: Player, prefix: string, encharmorscore: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.enchantedarmor) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (encharmorscore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: enchantedarmor`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: enchantedarmor [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles Anti Enchanted Armor for all players.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}enchantedarmor`,
        `    ${prefix}enchantedarmor help`,
    ]);
}

/**
 * @name enchantedarmor
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function enchantedarmor(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/enchantedarmor.js:33)");
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

    let encharmorscore = getScore("encharmor", player);

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.enchantedarmor) {
        return enchantedArmorHelp(player, prefix, encharmorscore);
    }

    if (encharmorscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config encharmor 1`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Anti Enchanted Armor§r!`);
    } else if (encharmorscore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config encharmor 0`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Anti Enchanted Armor§r!`);
    }
    return player.runCommand(`scoreboard players operation @a encharmor = paradox:config encharmor`);
}
