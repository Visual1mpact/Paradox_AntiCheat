import { BeforeChatEvent, Player } from "@minecraft/server";
import versionFile from "../../version.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

function versionHelp(player: Player, prefix: string) {
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: version`,
        `§4[§6Usage§4]§r: version [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Will print out the installed version of paradox`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}version`,
        `    ${prefix}version help`,
    ]);
}

/**
 * @name clearchat
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function paradoxVersion(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./utility/notify.js:26)");
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

    // Was help requested
    const argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help") {
        return versionHelp(player, prefix);
    }

    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r Version §2${versionFile.version}`);
}
