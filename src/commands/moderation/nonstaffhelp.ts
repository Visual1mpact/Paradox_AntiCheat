import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";

/**
 * @name nonstaffhelp
 * @param {BeforeChatEvent} message - Message object
 */
export function nonstaffhelp(message: BeforeChatEvent) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/nonstaffhelp.js:7)");
    }

    message.cancel = true;

    const player = message.sender;

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId === undefined) {
        return sendMsgToPlayer(player, [
            `§l§6[§4Non-Staff Commands§6]§r`,
            config.customcommands.report ? `§6${prefix}report <username>§r - Report suspicious players to staff.` : `§6${prefix}report <username>§r - Command §4DISABLED§r.`,
            config.customcommands.sethome ? `§6${prefix}sethome <name>§r - Saves current coordinates as home.` : `§6${prefix}sethome <name>§r - Command §4DISABLED§r.`,
            config.customcommands.gohome ? `§6${prefix}gohome <name>§r - Teleport back to saved home coordinates.` : `§6${prefix}gohome <name>§r - Command §4DISABLED§r.`,
            config.customcommands.listhome ? `§6${prefix}listhome§r - Shows your list of saved locations.` : `§6${prefix}listhome§r - Command §4DISABLED§r.`,
            config.customcommands.delhome ? `§6${prefix}delhome <name>§r - Deletes a saved location from list.` : `§6${prefix}delhome <name>§r - Command §4DISABLED§r.`,
        ]);
    }
}
