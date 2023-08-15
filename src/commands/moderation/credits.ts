import { ChatSendAfterEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsgToPlayer } from "../../util.js";

function creditsHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.credits) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: credits`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: credits [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Shows credits for Paradox Anti Cheat.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}credits`,
        `        §4- §6Show credits for Paradox Anti Cheat§f`,
        `    ${prefix}credits help`,
        `        §4- §6Show command help§f`,
    ]);
}

/**
 * @name credits
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function credits(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/credits.js:26)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.credits) {
        return creditsHelp(player, prefix);
    }

    sendMsgToPlayer(player, [
        ` `,
        `§l§6                    Based on Scythe AntiCheat`,
        `§l§4-----------------------------------------------------`,
        `§lGithub:§f https://https://github.com/MrDiamond64/Scythe-AntiCheat`,
        `§lDeveloped and maintained by MrDiamond64`,
        ` `,
        `§l§6                 Major Contributers For Scythe`,
        `§l§4-----------------------------------------------------`,
        `Visual1mpact#1435 - Porting function-based commands to GameTest commands and finding many bugs`,
        ` `,
        `§l§6                    Paradox AntiCheat (archived)`,
        `§l§4-----------------------------------------------------`,
        `§lGithub:§f https://github.com/Visual1mpact/Paradox_AntiCheat`,
        `§lParadox AntiCheat§f - a utility to fight against malicious hackers on Bedrock Edition.`,
        `§lDeveloped and maintained by Visual1mpact#1435`,
        ` `,
        `§l§6                    Paradox AntiCheat (archived)`,
        `§l§4-----------------------------------------------------`,
        `§lGithub:§f https://github.com/frostice482/Paradox_AntiCheat`,
        `§lDeveloped and maintained by FrostIce482#8139`,
        ` `,
        `§l§6                    Paradox AntiCheat (Continued)`,
        `§l§4-----------------------------------------------------`,
        `§lGithub:§f https://github.com/Pete9xi/Paradox_AntiCheat`,
        `§lDeveloped and maintained by Pete9xi#7928`,
        ` `,
        `§l§6                 Major Contributers For Paradox`,
        `§l§4-----------------------------------------------------`,
        `Glitch#8024 - Implementing features and bug fixes`,
        `FrostIce482#8139 - Implementing features, enhancing debugging, and bug fixes`,
        `Visual1mpact#1435 - Implementing Features, debugging, security, and bug fixes`,
        `Pete9xi#7928 - Implementing Features, debugging, GUI guru, and bug fixes`,
        ` `,
    ]);
    return;
}
