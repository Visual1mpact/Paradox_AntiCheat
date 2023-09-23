import { ChatSendAfterEvent, Player } from "@minecraft/server";
import { getPrefix, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";

function pvpHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.pvp) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: pvp`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: pvp [optional]`,
        `§4[§6Optional§4]§f: enable, disable, help`,
        `§4[§6Description§4]§f: Enables or Disables PVP. While disabled you wont take damage when another player attacks you.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}pvp enable`,
        `        §4- §6Enables PVP§f`,
        `    ${prefix}pvp disable`,
        `        §4- §6Disables PVP§f`,
        `    ${prefix}pvp help`,
        `        §4- §6Show command help§f`,
    ]);
}

/**
 * @name pvp
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function pvp(message: ChatSendAfterEvent, args: string[]) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/pvp.js:26)");
    }

    const player = message.sender;

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return pvpHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if (argCheck && (args[0].toLowerCase() === "help" || !config.customcommands.pvp)) {
        return pvpHelp(player, prefix);
    }
    if (argCheck && args[0].toLowerCase() === "enable") {
        player.removeTag("pvpDisabled");
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You have §2enabled §fPVP.`);
    }
    if (argCheck && args[0].toLowerCase() === "disable") {
        player.addTag("pvpDisabled");
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You have §4disabled §fPVP.`);
    }
}
