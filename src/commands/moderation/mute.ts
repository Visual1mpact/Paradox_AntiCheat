/* eslint no-var: "off"*/
import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function muteHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.mute) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: mute`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: mute [optional]`,
        `§4[§6Optional§4]§r: mute, reason, help`,
        `§4[§6Description§4]§r: Mutes the specified user and optionally gives reason.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}mute ${player.name}`,
        `    ${prefix}mute ${player.name} Stop spamming!`,
        `    ${prefix}mute help`,
    ]);
}

/**
 * @name mute
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function mute(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/mute.js:30)");
    }

    message.cancel = true;

    const player = message.sender;
    const reason = args.slice(1).join(" ") || "No reason specified";

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
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.mute) {
        return muteHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return muteHelp(player, prefix);
    }

    // try to find the player requested
    let member: Player;
    for (const pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
    }

    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // Get unique ID
    const uniqueId2 = dynamicPropertyRegistry.get(member.scoreboard.id);

    // Make sure they dont mute themselves
    if (uniqueId2 === uniqueId) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot mute yourself.`);
    }

    // Make sure staff dont mute staff
    if (uniqueId2 === member.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot mute staff players.`);
    }

    // If not already muted then tag
    if (!member.hasTag("isMuted")) {
        member.addTag("isMuted");
    } else {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r This player is already muted.`);
    }
    // If Education Edition is enabled then legitimately mute them
    try {
        await member.runCommandAsync(`ability @s mute true`);
    } catch (error) {}
    sendMsgToPlayer(member, `§r§4[§6Paradox§4]§r You have been muted. Reason: ${reason}`);
    return sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has muted ${member.nameTag}§r. Reason: ${reason}`);
}
