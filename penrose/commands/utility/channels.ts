import { Player, ChatSendBeforeEvent, TicksPerSecond, system, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { channelsDB } from "../../event-listeners/world-initialize";
import { Channel } from "../../classes/database/db-types";
import { PlayerCache } from "../../classes/cache/player-cache";
import { EventCoordinator } from "../../classes/core/event-coordinator";

interface Invitation {
    sender: Player;
    channel: string;
    timeoutId: number;
}

/** Maps receiver ID to the Invitation object */
const pendingInvitations = new Map<string, Invitation>();
const TIMEOUT_SECONDS = 30;
const TPS = TicksPerSecond;

/** Prevents duplicate event registration if the module is re-evaluated. */
let isCleanupRegistered = false;

/**
 * Registers the playerLeave cleanup logic for the Channel system.
 */
function registerChannelsCleanup(): void {
    if (isCleanupRegistered) return;

    // Cleanup invitations on leave
    EventCoordinator.subscribeAfter("playerLeave", (event) => {
        pendingInvitations.delete(event.playerId);
    });

    // Lazy validation: Clear stale channel properties when a player joins
    EventCoordinator.subscribeAfter("playerSpawn", async (event) => {
        const { player, initialSpawn } = event;
        if (!initialSpawn) return;
        const channelName = player.getDynamicProperty("currentChannel") as string;
        if (channelName && !(await channelsDB.get(channelName))) player.setDynamicProperty("currentChannel", undefined);
    });

    isCleanupRegistered = true;
}

registerChannelsCleanup();

/**
 * Retrieves a channel by its name from the database.
 *
 * @param {string} channelName - The name of the channel to fetch.
 * @returns {Promise<Channel | undefined>} The retrieved channel object or undefined.
 */
async function getChannel(channelName: string): Promise<Channel | undefined> {
    return (await channelsDB.get(channelName)) as Channel | undefined;
}

/**
 * Saves channel data to the database.
 *
 * @param {string} channelName - The key name of the channel.
 * @param {Channel} channel - The channel payload object.
 * @returns {Promise<void>}
 */
async function saveChannels(channelName: string, channel: Channel): Promise<void> {
    await channelsDB.set(channelName, channel);
}

/**
 * Cancels a pending invitation if it exists for a player.
 *
 * @param {string} receiverId - Target player's string ID.
 */
function cancelInvitation(receiverId: string): void {
    const invitation = pendingInvitations.get(receiverId);
    if (invitation) {
        system.clearRun(invitation.timeoutId);
        pendingInvitations.delete(receiverId);
    }
}

/**
 * Parses and extracts a flag argument value from command inputs.
 *
 * @param {string[]} args - Parameter array.
 * @param {string | string[]} flag - Single flag or array of valid flag aliases.
 * @returns {string | undefined} Extracted flag parameter value.
 */
function getFlagValue(args: string[], flag: string | string[]): string | undefined {
    const flagIndex = args.findIndex((arg) => (Array.isArray(flag) ? flag.includes(arg) : arg === flag));
    return flagIndex !== -1 ? args[flagIndex + 1] : undefined;
}

/**
 * Handles creation of a new channel room.
 *
 * @param {Player} sender - Executing player.
 * @param {string} [roomName] - Target channel name.
 * @returns {Promise<void>}
 */
async function handleCreateChannel(sender: Player, roomName?: string): Promise<void> {
    if (!roomName) {
        sender.sendMessage(`§o§c[Paradox] Please specify a channel name using --room.`);
        return;
    }

    if (sender.getDynamicProperty("currentChannel")) {
        sender.sendMessage(`§2[§7Paradox§2]§o§7 You are already in a channel. Please leave your current channel before creating a new one.`);
        return;
    }

    const channel = await getChannel(roomName);
    if (channel) {
        sender.sendMessage(`§o§c[Paradox] Channel '${roomName}§c' already exists.`);
        return;
    }

    await saveChannels(roomName, { Owner: sender.name, Members: { [sender.id]: sender.name }, lastActive: Date.now() });
    sender.setDynamicProperty("currentChannel", roomName);
    sender.sendMessage(`§2[§7Paradox§2]§o§7 Channel '${roomName}§7' created.`);
}

/**
 * Directs player to join an existing channel.
 *
 * @param {Player} sender - Executing player.
 * @param {string} [roomName] - Target channel name.
 * @returns {Promise<void>}
 */
async function handleJoinChannel(sender: Player, roomName?: string): Promise<void> {
    if (!roomName) {
        sender.sendMessage(`§o§c[Paradox] Please specify a channel name using --room.`);
        return;
    }

    if (sender.getDynamicProperty("currentChannel")) {
        sender.sendMessage(`§2[§7Paradox§2]§o§7 You are already in a channel.`);
        return;
    }

    const channel = await getChannel(roomName);
    if (!channel) {
        sender.sendMessage(`§o§c[Paradox] Channel '${roomName}§c' does not exist.`);
        return;
    }

    channel.Members[sender.id] = sender.name;
    channel.lastActive = Date.now();
    sender.setDynamicProperty("currentChannel", roomName);
    await saveChannels(roomName, channel);
    sender.sendMessage(`§2[§7Paradox§2]§o§7 You have joined channel '${roomName}§7'.`);

    for (const memberId in channel.Members) {
        const member = PlayerCache.getPlayerById(memberId);
        if (member && member.isValid && member.id !== sender.id) {
            member.sendMessage(`§2[§7Paradox§2]§o§7 ${sender.name} has joined channel '${roomName}§7'.`);
        }
    }
}

/**
 * Dispatches channel invitations to targeted online players.
 *
 * @param {Player} sender - Executing player.
 * @param {string} [roomName] - Target channel name.
 * @param {string} [targetName] - Target invitee username.
 * @returns {Promise<void>}
 */
async function handleInviteToChannel(sender: Player, roomName?: string, targetName?: string): Promise<void> {
    if (!roomName || !targetName) {
        sender.sendMessage(`§o§c[Paradox] Please specify a channel name using --room and a target player using --target.`);
        return;
    }

    const receiver = PlayerCache.getPlayerByName(targetName);
    if (!receiver) {
        sender.sendMessage(`§o§c[Paradox] Player '${targetName}§c' not found.`);
        return;
    }

    if (receiver.id === sender.id) {
        sender.sendMessage("§o§c[Paradox] You cannot invite yourself.");
        return;
    }

    if (pendingInvitations.has(receiver.id)) {
        sender.sendMessage(`§2[§7Paradox§2]§o§7 ${targetName}§7 is already handling an invitation.`);
        return;
    }

    if (!(await getChannel(roomName))) {
        sender.sendMessage(`§o§c[Paradox] Channel '${roomName}§c' does not exist.`);
        return;
    }

    const timeoutId = system.runTimeout(() => {
        if (sender.isValid) sender.sendMessage(`§2[§7Paradox§2]§o§7 ${targetName}§7 did not respond in time. Invitation canceled.`);
        if (receiver.isValid) receiver.sendMessage(`§2[§7Paradox§2]§o§7 You did not respond to the channel invitation in time. Invitation canceled.`);
        cancelInvitation(receiver.id);
    }, TIMEOUT_SECONDS * TPS);

    const prefix = (world.getDynamicProperty("__prefix") as string) ?? ":";
    pendingInvitations.set(receiver.id, { sender, channel: roomName, timeoutId });
    receiver.sendMessage(`§2[§7Paradox§2]§o§7 ${sender.name}§7 invited you to join channel '${roomName}§7'. Type ${prefix}channel join --room ${roomName}§7 to join or ${prefix}channel leave --room ${roomName}§7 to decline.`);
    sender.sendMessage(`§2[§7Paradox§2]§o§7 Invitation sent to ${targetName}§7 to join channel '${roomName}§7'.`);
}

/**
 * Reassigns ownership of a target channel room.
 *
 * @param {Player} sender - Executing player.
 * @param {string} [roomName] - Target channel name.
 * @param {string} [targetName] - Nominated new channel owner.
 * @returns {Promise<void>}
 */
async function handleTransferOwnership(sender: Player, roomName?: string, targetName?: string): Promise<void> {
    if (!roomName || !targetName) {
        sender.sendMessage(`§o§c[Paradox] Please specify a channel name using --room and a target player using --target.`);
        return;
    }

    const channel = await getChannel(roomName);
    if (!channel) {
        sender.sendMessage(`§o§c[Paradox] Channel '${roomName}§c' does not exist.`);
        return;
    }

    if (channel.Owner !== sender.name) {
        sender.sendMessage(`§2[§7Paradox§2]§o§7 You are not the owner of channel '${roomName}§7'.`);
        return;
    }

    const newOwner = PlayerCache.getPlayerByName(targetName);
    if (!newOwner) {
        sender.sendMessage(`§o§c[Paradox] Player '${targetName}§c' not found.`);
        return;
    }

    channel.Owner = targetName;
    channel.lastActive = Date.now();
    await saveChannels(roomName, channel);
    sender.sendMessage(`§2[§7Paradox§2]§o§7 Ownership of channel '${roomName}§7' transferred to ${targetName}§7.`);
    newOwner.sendMessage(`§2[§7Paradox§2]§o§7 You are now the owner of channel '${roomName}§7'.`);
}

/**
 * Handles owner departure routines and secondary assignment.
 *
 * @param {Player} sender - Leaving owner player.
 * @param {string} channelName - Channel room target.
 * @param {Channel} channel - Channel instance reference.
 * @returns {Promise<void>}
 */
async function handleOwnerLeave(sender: Player, channelName: string, channel: Channel): Promise<void> {
    const remainingMembers = Object.keys(channel.Members);

    if (remainingMembers.length > 0) {
        const newOwnerId = remainingMembers[0]!;
        const newOwnerName = channel.Members[newOwnerId]!;
        channel.Owner = newOwnerName;

        for (const memberId in channel.Members) {
            const member = PlayerCache.getPlayerById(memberId);
            if (member && member.isValid) {
                member.sendMessage(`§2[§7Paradox§2]§o§7 ${sender.name} left '${channelName}§7'. Ownership transferred to ${newOwnerName}§7.`);
            }
        }

        sender.sendMessage(`§2[§7Paradox§2]§o§7 You left '${channelName}§7'. Ownership transferred to ${newOwnerName}§7.`);
        await saveChannels(channelName, channel);
    } else {
        await channelsDB.delete(channelName);
        sender.sendMessage(`§2[§7Paradox§2]§o§7 You left and deleted empty channel '${channelName}§7'.`);
    }
}

/**
 * Removes active player from their bound dynamic channel room.
 *
 * @param {Player} sender - Target leaving player.
 * @returns {Promise<void>}
 */
async function handleLeaveChannel(sender: Player): Promise<void> {
    const channelName = sender.getDynamicProperty("currentChannel") as string | undefined;
    if (!channelName) {
        sender.sendMessage(`§o§c[Paradox] You are not in any channel to leave.`);
        return;
    }

    const channel = await getChannel(channelName);
    if (!channel) {
        sender.setDynamicProperty("currentChannel", undefined);
        sender.sendMessage(`§o§c[Paradox] The channel you were in has been deleted.`);
        return;
    }

    delete channel.Members[sender.id];
    sender.setDynamicProperty("currentChannel", undefined);

    if (channel.Owner === sender.name) {
        await handleOwnerLeave(sender, channelName, channel);
        return;
    }

    await saveChannels(channelName, channel);
    sender.sendMessage(`§2[§7Paradox§2]§o§7 You left channel '${channelName}§7'.`);

    for (const memberId in channel.Members) {
        const member = PlayerCache.getPlayerById(memberId);
        if (member && member.isValid) {
            member.sendMessage(`§2[§7Paradox§2]§o§7 ${sender.name} has left '${channelName}§7'.`);
        }
    }
}

/**
 * Represents the channel command.
 */
export const channelCommand: Command = {
    name: "channel",
    description: "Manage chat channels: create, join, invite, leave, and transfer ownership.",
    usage: `{prefix}channel <create | join | invite | leave | transfer | help>
            --room <name> [--target <player>]`,
    examples: [`{prefix}channel create --room <room>`, `{prefix}channel join --room <room>`, `{prefix}channel invite --room <room> --target <player>`, `{prefix}channel leave`, `{prefix}channel transfer --room <room> --target <player>`],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/gui/newgui/Language18.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Channel Management",
        description:
            "Organize and participate in private, moderated chat rooms.\n\n" +
            "§7Management:\n" +
            "§7• Create unique channels for private group communication.\n" +
            "§7• Invite others with secure, 30-second invitations.\n" +
            "§7• Transfer room ownership or join existing channels.\n\n" +
            "§7Notes:\n" +
            "§7• Channels are automatically deleted when empty.\n" +
            "§7• You can only be a member of one channel at a time.\n\n",
        commandOrder: "command-arg",
        actions: [
            { name: "Create Channel", icon: "textures/ui/color_plus.png", command: ["create"], description: "Create a new chat channel", requiredFields: ["roomName"], crypto: false, generateModalForm: true },
            { name: "Join Channel", icon: "textures/ui/plus.png", command: ["join"], description: "Join an existing chat channel", requiredFields: ["roomName"], crypto: false, generateModalForm: true },
            { name: "Invite to Channel", icon: "textures/ui/send_icon.png", command: ["invite"], description: "Invite a player to a chat channel", requiredFields: ["roomName", "targetName"], crypto: false, generateModalForm: true },
            { name: "Leave Channel", icon: "textures/ui/cancel.png", command: ["leave"], description: "Leave a chat channel", requiredFields: [], crypto: false, generateModalForm: false },
            { name: "Transfer Ownership", icon: "textures/ui/refresh_light.png", command: ["transfer"], description: "Transfer channel ownership", requiredFields: ["roomName", "targetName"], crypto: false, generateModalForm: true },
        ],
        dynamicFields: [
            { name: "\nName of Room:", arg: "--room", type: "text", placeholder: "Enter Channel Name", requiredFields: ["roomName"] },
            { name: "\nSelect Players Name:", arg: "--target", type: "dropdown", sourceType: "players", requiredFields: ["targetName"] },
        ],
    },

    /**
     * Executes the channel command.
     * @param {ChatSendBeforeEvent} message - The message object representing the chat event.
     * @param {string[]} args - The command arguments parsed from the chat message.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args?: string[]): Promise<void> => {
        if (!message) return;
        const sender = message.sender;
        const safeArgs = args ?? [];

        // Global Sanity Check: If the player thinks they are in a channel that doesn't exist, clear it.
        const storedChannelName = sender.getDynamicProperty("currentChannel") as string;
        if (storedChannelName && !(await channelsDB.get(storedChannelName))) {
            sender.setDynamicProperty("currentChannel", undefined);
        }

        const command = safeArgs[0];
        const roomName = getFlagValue(safeArgs, ["--room", "-r"])?.replace(/["@]/g, "");
        const targetName = getFlagValue(safeArgs, ["--target", "-t"])?.replace(/["@]/g, "");

        switch (command) {
            case "create":
                await handleCreateChannel(sender, roomName);
                break;
            case "join":
                await handleJoinChannel(sender, roomName);
                break;
            case "invite":
                await handleInviteToChannel(sender, roomName, targetName);
                break;
            case "leave":
                await handleLeaveChannel(sender);
                break;
            case "transfer":
                await handleTransferOwnership(sender, roomName, targetName);
                break;
            case "help":
                sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${channelCommand.usage}`);
                break;
            default:
                sender.sendMessage(`§o§c[Paradox] Unknown command '${command}'.`);
                sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${channelCommand.usage}`);
                break;
        }
    },
};
