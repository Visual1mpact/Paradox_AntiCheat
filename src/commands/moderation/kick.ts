/* eslint no-var: "off"*/
import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function kickHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.kick) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: kick`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: kick [optional]`,
        `§4[§6Optional§4]§r: username, reason, help`,
        `§4[§6Description§4]§r: Kick the specified user and optionally gives a reason.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}kick ${player.name}`,
        `    ${prefix}kick ${player.name} Hacker!`,
        `    ${prefix}kick ${player.name} Stop trolling!`,
        `    ${prefix}kick help`,
    ]);
}

/**
 * @name kick
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function kick(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/kick.js:33)");
    }

    message.cancel = true;

    const player = message.sender;
    const reason = args.slice(1).join(" ").replace("-s", "") || "No reason specified";

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
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.kick) {
        return kickHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return kickHelp(player, prefix);
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

    // make sure they dont kick themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot kick yourself.`);
    }

    try {
        await player.runCommandAsync(`kick ${JSON.stringify(member.name)} ${reason}`);
    } catch (error) {
        console.warn(`${new Date()} | ` + error);
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r I was unable to kick that player! Error: ${error}`);
    }
    return sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has kicked ${member.nameTag}§r. Reason: ${reason}`);
}
