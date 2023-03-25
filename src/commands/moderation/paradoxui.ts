import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player } from "@minecraft/server";
import { paradoxui } from "../../gui/paradoxui.js";

function paradoxuiHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.paradoxiu) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: paradoxui`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: paradoxui [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Shows GUI for main menu.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}paradoxui`,
        `    ${prefix}paradoxui help`,
    ]);
}

/**
 * @name paradoxUI
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function paradoxUI(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/paradoxui.js:36)");
    }

    message.cancel = true;

    const player = message.sender;

    if (!config.debug) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Debugging is not enabled!`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.paradoxiu) {
        return paradoxuiHelp(player, prefix);
    }

    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has requested §6ParadoxUI§r!`);
    paradoxui(player);
}
