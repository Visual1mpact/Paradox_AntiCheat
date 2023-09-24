import { getPrefix, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { ChatSendAfterEvent, Player } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";

function resetPrefix(player: Player) {
    const sanitize = player.getTags();
    for (const tag of sanitize) {
        if (tag.startsWith("Prefix:")) {
            player.removeTag(tag);
            config.customcommands.prefix = "!";
        }
    }
    sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Prefix has been reset!`);
}

function prefixHelp(player: Player, prefix: string) {
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: prefix`,
        `§4[§6Usage§4]§f: prefix [optional]`,
        `§4[§6Optional§4]§f: prefix, help`,
        `§4[§6Description§4]§f: Changes the prefix for commands. Max is two characters.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}prefix !!`,
        `        §4- §6Change command prefix to "!!"§f`,
        `    ${prefix}prefix @!`,
        `        §4- §6Change command prefix to "@!"§f`,
        `    ${prefix}prefix $`,
        `        §4- §6Change command prefix to "$"§f`,
        `    ${prefix}prefix help`,
        `        §4- §6Show command help§f`,
    ]);
}

/**
 * @name prefix
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function prefix(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/prefix.js:34)");
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
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.prefix) {
        return prefixHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return prefixHelp(player, prefix);
    }

    // check if array contains the string 'reset'
    const argcheck = args.includes("reset");

    // reset prefix
    if (argcheck === true) {
        resetPrefix(player);
        return;
    }

    if (args[0][0] == "/") {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Using prefix '/' is not allowed!`);
    }

    // Change Prefix command under conditions
    if (args[0].length <= 2 && args[0].length >= 1) {
        resetPrefix(player);
        config.customcommands.prefix = args[0];
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Prefix has been changed to '§7${args[0]}§f'!`);
        return player.addTag("Prefix:" + args[0]);
    } else {
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f Prefix length cannot be more than 2 characters!`);
    }
}
