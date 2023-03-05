import { BeforeChatEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, getScore, sendMsg, sendMsgToPlayer } from "../../util.js";

function overrideCBEHelp(player: Player, prefix: string, cmdsscore: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.overidecommandblocksenabled) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (cmdsscore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: overridecbe`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: overridecbe [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Forces the commandblocksenabled gamerule to be enabled or disabled at all times.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}overridecbe`,
        `    ${prefix}overridecbe help`,
    ]);
}

/**
 * @name overidecommandblocksenabled
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function overidecommandblocksenabled(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/overideCommandBlocksEnabled.js:7)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    const cmdsscore = getScore("cmds", player);

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.overidecommandblocksenabled) {
        return overrideCBEHelp(player, prefix, cmdsscore);
    }

    if (cmdsscore <= 0) {
        // Allow
        await player.runCommandAsync(`scoreboard players set paradox:config cmds 1`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has set CommandBlocksEnabled as §6enabled§r!`);
    } else if (cmdsscore === 1) {
        // Deny
        await player.runCommandAsync(`scoreboard players set paradox:config cmds 2`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has set CommandBlocksEnabled as §4disabled§r!`);
    } else if (cmdsscore >= 2) {
        // Force
        await player.runCommandAsync(`scoreboard players set paradox:config cmds 0`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has §etoggled§r Force-CommandBlocksEnabled!`);
    }
    return await player.runCommandAsync(`scoreboard players operation @a cmds = paradox:config cmds`);
}
