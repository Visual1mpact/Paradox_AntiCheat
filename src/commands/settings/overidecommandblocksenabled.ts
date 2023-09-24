import { ChatSendAfterEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import { ScoreManager } from "../../classes/ScoreManager.js";

function overrideCBEHelp(player: Player, prefix: string, cmdsscore: number) {
    let commandStatus: string;
    if (!config.customcommands.overidecommandblocksenabled) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (cmdsscore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: overridecbe`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: overridecbe [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Forces the commandblocksenabled gamerule to be enabled or disabled at all times.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}overridecbe`,
        `    ${prefix}overridecbe help`,
    ]);
}

/**
 * @name overidecommandblocksenabled
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function overidecommandblocksenabled(message: ChatSendAfterEvent, args: string[]) {
    handleOverideCommandBlocksEnabled(message, args).catch((error) => {
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

async function handleOverideCommandBlocksEnabled(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/overideCommandBlocksEnabled.js:7)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    const cmdsscore = ScoreManager.getScore("cmds", player);

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.overidecommandblocksenabled) {
        return overrideCBEHelp(player, prefix, cmdsscore);
    }

    if (cmdsscore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config cmds 1`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has set CommandBlocksEnabled as §6enabled§f!`);
    } else if (cmdsscore === 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config cmds 2`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has set CommandBlocksEnabled as §4disabled§f!`);
    } else if (cmdsscore >= 2) {
        // Force
        player.runCommand(`scoreboard players set paradox:config cmds 0`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has §etoggled§f Force-CommandBlocksEnabled!`);
    }
    return player.runCommand(`scoreboard players operation @a cmds = paradox:config cmds`);
}
