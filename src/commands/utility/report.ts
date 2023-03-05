import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function reportHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.report) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: report`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: report [optional]`,
        `§4[§6Optional§4]§r: username, reason, help`,
        `§4[§6Description§4]§r: Reports player's to online Staff for malicious activities.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}report ${player.name}`,
        `    ${prefix}report ${player.name} Caught hacking!`,
        `    ${prefix}report help`,
    ]);
}

/**
 * @name report
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function report(message: BeforeChatEvent, args: string[]) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/ban.js:29)");
    }

    message.cancel = true;

    const player = message.sender;
    const reason = args.slice(1).join(" ") || "No reason specified";

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return reportHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.report) {
        return reportHelp(player, prefix);
    }

    // Try to find the player requested
    let member: Player;
    for (const pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
    }

    if (!member) {
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r !report <player> <reason>§r`);
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // Make sure they dont report themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot report yourself.`);
    }

    sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Reported ${member.nameTag}§r with reason: ${reason}`);

    sendMsg("@a[tag=notify]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has reported ${member.nameTag}§r with reason: ${reason}`);
}
