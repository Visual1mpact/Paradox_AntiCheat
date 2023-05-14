import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";

export const queueUnban = new Set<string>();

function listQueue(queued: Set<string>, player: Player) {
    sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Queued to be unbanned:`);
    const setSize = queued.size;
    if (setSize > 0) {
        queued.forEach((queue: string) =>
            // List the players that are queued to be unbanned
            sendMsgToPlayer(player, ` §6|§r §4[§r${queue}§4]§r`)
        );
    } else {
        sendMsgToPlayer(player, ` §6|§r §4[§rList Is Empty§4]§r`);
    }
}

function unbanHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.unban) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: unban`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: unban [optional]`,
        `§4[§6Optional§4]§r: username, list, delete, help`,
        `§4[§6Description§4]§r: Allows specified players to join if banned (Doesn't include global ban).`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}unban ${player.name}`,
        `    ${prefix}unban list`,
        `    ${prefix}unban delete ${player.name}`,
        `    ${prefix}unban help`,
    ]);
}

/**
 * @name unban
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function unban(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/unban.js:35)");
    }

    message.cancel = true;

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
        return unbanHelp(player, prefix);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.unban) {
        return unbanHelp(player, prefix);
    } else if ((argCheck && args[0].toLowerCase() === "list") || !config.customcommands.unban) {
        listQueue(queueUnban, player);
        return;
    } else if ((argCheck && args[0].toLowerCase() === "delete") || !config.customcommands.unban) {
        const nameToDelete = args
            .slice(1)
            .join(" ")
            .match(/^ *(?:"?@?"?)?(.*?)(?:"? *$)?$/)?.[1];
        if (queueUnban.delete(nameToDelete)) {
            sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${nameToDelete} has been removed from the unban queue!`);
        } else {
            sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r ${nameToDelete} is not in the unban queue!`);
        }
        return;
    }

    // Add player to queue
    const regexp = /["'`@]/g;
    queueUnban.add(args.join(" ").replace(regexp, ""));
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${args.join(" ").replace(regexp, "")} is queued to be unbanned!`);
}
