/* eslint no-var: "off"*/

import { BeforeChatEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";

function fullReportHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.fullreport) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: fullreport`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: fullreport [optional]`,
        `§4[§6Optional§4]§r: username, help`,
        `§4[§6Description§4]§r: View logs from all player's currently online.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}fullreport`,
        `    ${prefix}fullreport help`,
    ]);
}

/**
 * @name fullreport
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function fullreport(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/fullreport.js:28)");
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

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.fullreport) {
        return fullReportHelp(player, prefix);
    }

    if (!player.hasTag("notify")) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to enable cheat notifications.`);
    }

    return player.runCommandAsync(`execute as @a at @s run function tools/stats`);
}
