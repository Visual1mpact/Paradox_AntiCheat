import { ChatSendAfterEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import { ScoreManager } from "../../classes/ScoreManager.js";

function removeCBEHelp(player: Player, prefix: string, commandblocksscore: number) {
    let commandStatus: string;
    if (!config.customcommands.removecommandblocks) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (commandblocksscore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: removecb`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: removecb [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Toggles Anti Command Blocks (Clears all when enabled).`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}removecb`,
        `    ${prefix}removecb help`,
    ]);
}

/**
 * @name removecommandblocks
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function removecommandblocks(message: ChatSendAfterEvent, args: string[]) {
    handleRemoveCommandBlocks(message, args).catch((error) => {
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

async function handleRemoveCommandBlocks(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/removeCommandBlocks.js:33)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    const commandblocksscore = ScoreManager.getScore("commandblocks", player);

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.removecommandblocks) {
        return removeCBEHelp(player, prefix, commandblocksscore);
    }

    if (commandblocksscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config commandblocks 1`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6Anti Command Blocks§f!`);
    } else if (commandblocksscore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config commandblocks 0`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4Anti Command Blocks§f!`);
    }
    return player.runCommand(`scoreboard players operation @a commandblocks = paradox:config commandblocks`);
}
