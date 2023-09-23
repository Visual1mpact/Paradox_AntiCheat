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
            config.customcommands.channel ? `§6${prefix}channel create <channel> [password?]§f - Create a new chat channel (with optional password).` : `§6${prefix}channel create <channel> [password?]§f - Command §4DISABLED§f.`,
            config.customcommands.channel ? `§6${prefix}channel delete <channel> [password?]§f - Delete an existing chat channel (with optional password).` : `§6${prefix}channel delete <channel> [password?]§f - Command §4DISABLED§f.`,
            config.customcommands.channel ? `§6${prefix}channel join <channel> [password?]§f - Join an existing chat channel (with optional password).` : `§6${prefix}channel join <channel> [password?]§f - Command §4DISABLED§f.`,
            config.customcommands.channel ? `§6${prefix}channel invite <channel> <player>§f - Invite a player to join your chat channel.` : `§6${prefix}channel invite <channel> <player>§f - Command §4DISABLED§f.`,
            config.customcommands.channel ? `§6${prefix}channel handover <channel> <player>§f - Transfer ownership of a chat channel..` : `§6${prefix}channel invite <channel> <player>§f - Command §4DISABLED§f.`,
            config.customcommands.channel ? `§6${prefix}channel members§f - List members of the current chat channel.` : `§6${prefix}channel members§f - Command §4DISABLED§f.`,
            config.customcommands.channel ? `§6${prefix}channel leave§f - Leave the current chat channel.` : `§6${prefix}channel leave§f - Command §4DISABLED§f.`,
            config.customcommands.pvp ? `§6${prefix}pvp§f - Enable or disable PvP mode.` : `§6${prefix}pvp§f - Command §4DISABLED§f.`,
        ]);
    }
}
