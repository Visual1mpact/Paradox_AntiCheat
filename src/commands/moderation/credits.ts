import { BeforeChatEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";

function creditsHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.credits) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: credits`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: credits [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Shows credits for Paradox Anti Cheat.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}credits`,
        `    ${prefix}credits help`,
    ]);
}

/**
 * @name credits
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function credits(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/credits.js:26)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
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
        `§lGithub:§r https://https://github.com/MrDiamond64/Scythe-AntiCheat`,
        `§lDeveloped and maintained by MrDiamond64`,
        ` `,
        `§l§6                 Major Contributers For Scythe`,
        `§l§4-----------------------------------------------------`,
        `Visual1mpact#1435 - Porting function-based commands to GameTest commands and finding many bugs`,
        ` `,
        `§l§6                        Paradox AntiCheat`,
        `§l§4-----------------------------------------------------`,
        `§lGithub:§r https://github.com/Visual1mpact/Paradox_AntiCheat`,
        `§lParadox AntiCheat§r - a utility to fight against malicious hackers on Bedrock Edition.`,
        `§lDeveloped and maintained by Visual1mpact`,
        ` `,
        `§l§6                 Major Contributers For Paradox`,
        `§l§4-----------------------------------------------------`,
        `Glitch#8024 - Implementing features and bug fixes`,
        `FrostIce482#8139 - Implementing features, enhancing debugging, and bug fixes`,
        ` `,
    ]);
    return;
}
