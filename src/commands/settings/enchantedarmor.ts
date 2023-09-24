import { ChatSendAfterEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import { ScoreManager } from "../../classes/ScoreManager.js";

function enchantedArmorHelp(player: Player, prefix: string, encharmorscore: number) {
    let commandStatus: string;
    if (!config.customcommands.enchantedarmor) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (encharmorscore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: enchantedarmor`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: enchantedarmor [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Toggles Anti Enchanted Armor for all players.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}enchantedarmor`,
        `    ${prefix}enchantedarmor help`,
    ]);
}

/**
 * @name enchantedarmor
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function enchantedarmor(message: ChatSendAfterEvent, args: string[]) {
    handleEnchantedArmor(message, args).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
        // Extract stack trace information
        if (error instanceof Error) {
            const stackLines = error.stack.split("\n");
            if (stackLines.length > 1) {
                const sourceInfo = stackLines;
                console.error("Error originated from:", sourceInfo[0]);
            }
        }
    });
}

async function handleEnchantedArmor(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/enchantedarmor.js:33)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    const encharmorscore = ScoreManager.getScore("encharmor", player);

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.enchantedarmor) {
        return enchantedArmorHelp(player, prefix, encharmorscore);
    }

    if (encharmorscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config encharmor 1`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6Anti Enchanted Armor§f!`);
    } else if (encharmorscore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config encharmor 0`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4Anti Enchanted Armor§f!`);
    }
    return player.runCommand(`scoreboard players operation @a encharmor = paradox:config encharmor`);
}
