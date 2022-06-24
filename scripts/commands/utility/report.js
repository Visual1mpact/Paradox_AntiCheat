import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function reportHelp(player, prefix) {
    let commandStatus;
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
    ])
}

/**
 * @name report
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function report(message, args) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/ban.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    let reason = args.slice(1).join(" ") || "No reason specified";

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.report) {
        return reportHelp(player, prefix);
    }
    
    // Try to find the player requested
    let member;
    for (let pl of World.getPlayers()) {
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

    // Prevent report spam
    if (player.lastReport === member.nameTag) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You have already reported this player.`);
    }
    player.lastReport = member.nameTag;

    sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Reported ${member.nameTag}§r with reason: ${reason}`);

    sendMsg('@a[tag=notify]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has reported ${member.nameTag}§r with reason: ${reason}`)
}
