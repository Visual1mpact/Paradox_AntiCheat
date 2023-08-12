import { getPrefix, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { ChatSendAfterEvent } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";

/**
 * @name nonstaffhelp
 * @param {ChatSendAfterEvent} message - Message object
 */
export function nonstaffhelp(message: ChatSendAfterEvent) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/nonstaffhelp.js:7)");
    }

    const player = message.sender;

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId === undefined) {
        return sendMsgToPlayer(player, [
            `§l§o§6[§4Non-Staff Commands§6]§r§o`,
            config.customcommands.report ? `§6${prefix}report <username>§f - Report suspicious players to staff.` : `§6${prefix}report <username>§f - Command §4DISABLED§f.`,
            config.customcommands.sethome ? `§6${prefix}sethome <name>§f - Saves current coordinates as home.` : `§6${prefix}sethome <name>§f - Command §4DISABLED§f.`,
            config.customcommands.gohome ? `§6${prefix}gohome <name>§f - Teleport back to saved home coordinates.` : `§6${prefix}gohome <name>§f - Command §4DISABLED§f.`,
            config.customcommands.listhome ? `§6${prefix}listhome§f - Shows your list of saved locations.` : `§6${prefix}listhome§f - Command §4DISABLED§f.`,
            config.customcommands.delhome ? `§6${prefix}delhome <name>§f - Deletes a saved location from list.` : `§6${prefix}delhome <name>§f - Command §4DISABLED§f.`,
            config.customcommands.tpr ? `§6${prefix}tpr <name>§f - Will send requests to tp to players.` : `§6${prefix}tpr <name>§f - Command §4DISABLED§f.`,
        ]);
    }
}
