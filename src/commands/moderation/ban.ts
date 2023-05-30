/* eslint no-var: "off"*/
import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

function banHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.ban) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: ban`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: ban [optional]`,
        `§4[§6Optional§4]§r: username, reason, help`,
        `§4[§6Description§4]§r: Bans the specified user and optionally gives a reason.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}ban ${player.name}`,
        `    ${prefix}ban ${player.name} Hacker!`,
        `    ${prefix}ban ${player.name} Caught exploiting!`,
        `    ${prefix}ban help`,
    ]);
}

/**
 * @name ban
 * @param {ChatSendAfterEvent} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function ban(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/ban.js:31)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return banHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.ban) {
        return banHelp(player, prefix);
    }

    // Modify the argument handling
    let playerName = args.shift();
    let reason = "No reason specified";

    // Check if the command has a reason provided
    if (args.length > 1) {
        // Remove double quotes from the reason if present
        reason = args
            .slice(1)
            .join(" ")
            .replace(/(^"|"$)/g, "");
    }

    // Remove double quotes from the player name if present
    playerName = playerName.replace(/(^"|"$)/g, "");

    // try to find the player requested
    let member: Player;
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(playerName.toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
            break;
        }
    }

    // Check if player exists
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // make sure they dont ban themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot ban yourself.`);
    }

    try {
        member.addTag("Reason:" + reason);
        member.addTag("By:" + player.nameTag);
        member.addTag("isBanned");
    } catch (error) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r I was unable to ban that player! Error: ${error}`);
    }
    return sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has banned ${member.nameTag}§r. Reason: ${reason}`);
}
