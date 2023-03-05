/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world, Location, Player, BeforeChatEvent } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";

const World = world;

function tpaHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.tpa) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: tpa`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: tpa [optional]`,
        `§4[§6Optional§4]§r: username, help`,
        `§4[§6Description§4]§r: Teleport to a player or vice versa.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}tpa ${player.name} Steve`,
        `    ${prefix}tpa Steve ${player.name}`,
        `    ${prefix}tpa help`,
    ]);
}

/**
 * @name tpa
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function tpa(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/tpa.js:31)");
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
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.tpa) {
        return tpaHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return tpaHelp(player, prefix);
    }

    let artificalPlayer: Player;
    let member: Player;

    // Try to find the player requested
    for (const pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            artificalPlayer = pl;
        }
        if (pl.nameTag.toLowerCase().includes(args[1].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
        if (artificalPlayer && member) {
            break;
        }
    }
    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player! Try '${prefix}tpa help' for more info.`);
    }

    // Check if teleporting to them or vice versa then set it up
    if (args[0] && args[1]) {
        // Let's teleport you to that player
        artificalPlayer.teleport(member.location, member.dimension, 0, 0);
        // Let you know that you have been teleported
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Teleported ${artificalPlayer.name} to ${member.name}`);
    } else {
        // Need to specify who
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You forgot to mention 'from' and 'who' to teleport.`);
        return tpaHelp(player, prefix);
    }
}
