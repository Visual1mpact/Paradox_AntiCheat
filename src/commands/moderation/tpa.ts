import { world, Player, ChatSendAfterEvent } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsgToPlayer, setTimer } from "../../util.js";

function tpaHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.tpa) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: tpa`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: tpa [optional]`,
        `§4[§6Optional§4]§f: username, help`,
        `§4[§6Description§4]§f: Teleport to a player or vice versa.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}tpa ${player.name} Steve`,
        `        §4- §6Request to teleport to ${player.name} from Steve§f`,
        `    ${prefix}tpa Steve ${player.name}`,
        `        §4- §6Request to teleport Steve to ${player.name}§f`,
        `    ${prefix}tpa help`,
        `        §4- §6Show command help§f`,
    ]);
}

/**
 * @name tpa
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function tpa(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/tpa.js:31)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
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
    const players = world.getPlayers();
    for (const pl of players) {
        if (pl.name.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            artificalPlayer = pl;
        }
        if (pl.name.toLowerCase().includes(args[1].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
        if (artificalPlayer && member) {
            break;
        }
    }
    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Couldn't find that player! Try '§7${prefix}tpa help§f' for more info.`);
    }

    // Check if teleporting to them or vice versa then set it up
    if (args[0] && args[1]) {
        // Let's teleport you to that player
        setTimer(artificalPlayer.id);
        artificalPlayer.teleport(member.location, { dimension: member.dimension, rotation: { x: 0, y: 0 }, facingLocation: { x: 0, y: 0, z: 0 }, checkForBlocks: false, keepVelocity: false });
        // Let you know that you have been teleported
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Teleported §7${artificalPlayer.name}§f to §7${member.name}§f`);
    } else {
        // Need to specify who
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You forgot to mention 'from' and 'who' to teleport.`);
        return tpaHelp(player, prefix);
    }
}
