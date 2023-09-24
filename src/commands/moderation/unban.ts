import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { ChatSendAfterEvent, Player } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";

export const queueUnban = new Set<string>();

function listQueue(queued: Set<string>, player: Player) {
    sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Queued to be unbanned:`);
    const setSize = queued.size;
    if (setSize > 0) {
        queued.forEach((queue: string) =>
            // List the players that are queued to be unbanned
            sendMsgToPlayer(player, ` §o§6|§f §4[§f${queue}§4]§f`)
        );
    } else {
        sendMsgToPlayer(player, ` §o§6|§f §4[§fList Is Empty§4]§f`);
    }
}

function unbanHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.unban) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: unban`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: unban [optional]`,
        `§4[§6Optional§4]§f: username, help, list, delete`,
        `§4[§6Description§4]§f: Allows specified players to join if banned (Doesn't include global ban).`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}unban ${player.name}`,
        `        §4- §6Allow ${player.name} to join if banned§f`,
        `    ${prefix}unban list`,
        `        §4- §6List players queued to be unbanned§f`,
        `    ${prefix}unban delete <username>`,
        `        §4- §6Remove a player from the unban queue§f`,
        `    ${prefix}unban help`,
        `        §4- §6Show command help§f`,
    ]);
}

export function unban(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | Error: ${message} isn't defined. Did you forget to pass it? (./commands/moderation/unban.js:35)`);
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

    // Are there arguments
    if (!args.length) {
        return unbanHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help") {
        return unbanHelp(player, prefix);
    }

    // List the queue if requested
    if (argCheck && args[0].toLowerCase() === "list") {
        return listQueue(queueUnban, player);
    }

    // Delete player from the queue if requested
    if (argCheck && args[0].toLowerCase() === "delete") {
        const nameToDelete = args.slice(1).join(" ");
        if (queueUnban.delete(nameToDelete)) {
            sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${nameToDelete}§f has been removed from the unban queue!`);
        } else {
            sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f §7${nameToDelete}§f is not in the unban queue!`);
        }
        return;
    }

    // Extract the username from the command and perform the unban action
    let username = args.join(" ");
    if (username.startsWith('"') && username.endsWith('"')) {
        username = username.slice(1, -1);
    }

    queueUnban.add(username);
    sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Player queued to be unbanned: §7${username}§f`);
}
