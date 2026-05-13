import { Player, ChatSendBeforeEvent, TicksPerSecond, system, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { channelsDB } from "../../event-listeners/world-initialize";
import { Channel } from "../../classes/database/db-types";
import { PlayerCache } from "../../classes/player-cache";
import { EventCoordinator } from "../../classes/event-coordinator";

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
function registerChannelsCleanup() {
    if (isCleanupRegistered) return;

    // Cleanup invitations on leave
    EventCoordinator.subscribeAfter("playerLeave", (event) => {
        pendingInvitations.delete(event.playerId);
    });

    // Lazy validation: Clear stale channel properties when a player joins
    EventCoordinator.subscribeAfter("playerSpawn", (event) => {
        const { player, initialSpawn } = event;
        if (!initialSpawn) return;
        const channelName = player.getDynamicProperty("currentChannel") as string;
        if (channelName && !channelsDB.get(channelName)) player.setDynamicProperty("currentChannel", undefined);
    });

    isCleanupRegistered = true;
}

registerChannelsCleanup();

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
        args = args ?? [];

        // message has been validated above; keep a non‑nullable reference for use
        // inside helper functions so TypeScript doesn’t complain.
        const msg = message;

        const playerName = msg.sender.name;
        const playerId = msg.sender.id; // Get the player's ID

        // Global Sanity Check: If the player thinks they are in a channel that doesn't exist, clear it.
        const storedChannelName = msg.sender.getDynamicProperty("currentChannel") as string;
        if (storedChannelName && !channelsDB.get(storedChannelName)) {
            msg.sender.setDynamicProperty("currentChannel", undefined);
        }

        /**
         * Retrieves a channel by its name.
         * @param {string} channelName - The name of the channel.
         * @returns {Channel | undefined} The channel object if found, otherwise undefined.
         */
        function getChannel(channelName: string): Channel | undefined {
            return channelsDB.get(channelName);
        }

        /**
         * Saves the channels data to the database.
         * @returns {Promise<void>}
         */
        async function saveChannels(channelName: string, channel: Channel): Promise<void> {
            await channelsDB.set(channelName, channel);
        }

        /**
         * Cancels an invitation if it exists.
         * @param {string} receiverName - The name of the player who received the invitation.
         */
        function cancelInvitation(receiverId: string): void {
            const invitation = pendingInvitations.get(receiverId);
            if (invitation) {
                system.clearRun(invitation.timeoutId);
                pendingInvitations.delete(receiverId);
            }
        }

        /**
         * Joins a channel if the player is not already in a channel.
         * @param {string} channelName - The name of the channel to join.
         * @returns {Promise<void>}
         */
        async function joinChannel(channelName: string): Promise<void> {
            const currentChannel = msg.sender.getDynamicProperty("currentChannel");
            if (currentChannel) {
                msg.sender.sendMessage(`§2[§7Paradox§2]§o§7 You are already in a channel.`);
                return;
            }

            const channel = getChannel(channelName);
            if (!channel) {
                msg.sender.sendMessage(`§o§c[Paradox] Channel '${channelName}§c' does not exist.`);
                return;
            }

            channel.Members[playerId] = playerName;
            channel.lastActive = Date.now();
            msg.sender.setDynamicProperty("currentChannel", channelName);
            await saveChannels(channelName, channel);
            msg.sender.sendMessage(`§2[§7Paradox§2]§o§7 You have joined channel '${channelName}§7'.`);

            // Notify other members of the new player
            for (const memberId in channel.Members) {
                const member = PlayerCache.getPlayerById(memberId);
                if (member && member.isValid && member.id !== playerId) {
                    member.sendMessage(`§2[§7Paradox§2]§o§7 ${playerName} has joined channel '${channelName}§7'.`);
                }
            }
        }

        /**
         * Sends an invitation to a player to join a channel.
         * @param {string} channelName - The name of the channel.
         * @param {string} receiverName - The name of the player to invite.
         * @returns {Promise<void>}
         */
        async function inviteToChannel(channelName: string, receiverName: string): Promise<void> {
            const receiver = PlayerCache.getPlayerByName(receiverName);
            if (!receiver) {
                msg.sender.sendMessage(`§o§c[Paradox] Player '${receiverName}§c' not found.`);
                return;
            }

            if (receiver.id === playerId) {
                msg.sender.sendMessage("§o§c[Paradox] You cannot invite yourself.");
                return;
            }

            if (pendingInvitations.has(receiver.id)) {
                msg.sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiverName}§7 is already handling an invitation.`);
                return;
            }

            if (!getChannel(channelName)) {
                msg.sender.sendMessage(`§o§c[Paradox] Channel '${channelName}§c' does not exist.`);
                return;
            }

            const timeoutId = system.runTimeout(() => {
                if (msg.sender.isValid) msg.sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiverName}§7 did not respond in time. Invitation canceled.`);
                if (receiver.isValid) receiver.sendMessage(`§2[§7Paradox§2]§o§7 You did not respond to the channel invitation in time. Invitation canceled.`);
                cancelInvitation(receiver.id);
            }, TIMEOUT_SECONDS * TPS);

            pendingInvitations.set(receiver.id, { sender: msg.sender, channel: channelName, timeoutId });
            receiver.sendMessage(
                `§2[§7Paradox§2]§o§7 ${msg.sender.name}§7 invited you to join channel '${channelName}§7'. Type ${world.getDynamicProperty("__prefix") ?? ":"}channel join --room ${channelName}§7 to join or ${world.getDynamicProperty("__prefix") ?? ":"}channel leave --room ${channelName}§7 to decline.`
            );
            msg.sender.sendMessage(`§2[§7Paradox§2]§o§7 Invitation sent to ${receiverName}§7 to join channel '${channelName}§7'.`);
        }

        /**
         * Transfers ownership of a channel to a new player.
         * @param {string} channelName - The name of the channel.
         * @param {string} newOwnerName - The name of the new owner.
         * @returns {Promise<void>}
         */
        async function transferChannelOwnership(channelName: string, newOwnerName: string): Promise<void> {
            const channel = getChannel(channelName);
            if (!channel) {
                msg.sender.sendMessage(`§o§c[Paradox] Channel '${channelName}§c' does not exist.`);
                return;
            }

            if (channel.Owner !== playerName) {
                msg.sender.sendMessage(`§2[§7Paradox§2]§o§7 You are not the owner of channel '${channelName}§7'.`);
                return;
            }

            const newOwner = PlayerCache.getPlayerByName(newOwnerName);
            if (!newOwner) {
                msg.sender.sendMessage(`§o§c[Paradox] Player '${newOwnerName}§c' not found.`);
                return;
            }

            channel.Owner = newOwnerName;
            channel.lastActive = Date.now();
            await saveChannels(channelName, channel);
            msg.sender.sendMessage(`§2[§7Paradox§2]§o§7 Ownership of channel '${channelName}§7' transferred to ${newOwnerName}§7.`);
            newOwner.sendMessage(`§2[§7Paradox§2]§o§7 You are now the owner of channel '${channelName}§7'.`);
        }

        /**
         * Allows a player to leave a channel.
         * @returns {Promise<void>}
         */
        async function leaveChannel(): Promise<void> {
            const channelName = msg.sender.getDynamicProperty("currentChannel") as string;
            const channel = channelName ? getChannel(channelName) : undefined;

            if (!channelName) {
                msg.sender.sendMessage(`§o§c[Paradox] You are not in any channel to leave.`);
                return;
            }

            if (!channel) {
                msg.sender.setDynamicProperty("currentChannel", undefined);
                msg.sender.sendMessage(`§o§c[Paradox] The channel you were in has been deleted.`);
                return;
            }

            delete channel.Members[playerId];
            msg.sender.setDynamicProperty("currentChannel", undefined);

            if (channel.Owner === playerName) {
                if (Object.keys(channel.Members).length > 0) {
                    const newOwnerId = Object.keys(channel.Members)[0];
                    const newOwnerName = channel.Members[newOwnerId];
                    channel.Owner = newOwnerName;

                    for (const memberId in channel.Members) {
                        const member = PlayerCache.getPlayerById(memberId);
                        if (member && member.isValid) {
                            member.sendMessage(`§2[§7Paradox§2]§o§7 ${playerName} left '${channelName}§7'. Ownership transferred to ${newOwnerName}§7.`);
                        }
                    }

                    msg.sender.sendMessage(`§2[§7Paradox§2]§o§7 You left '${channelName}§7'. Ownership transferred to ${newOwnerName}§7.`);
                    await saveChannels(channelName as string, channel);
                } else {
                    await channelsDB.delete(channelName);
                    msg.sender.sendMessage(`§2[§7Paradox§2]§o§7 You left and deleted empty channel '${channelName}§7'.`);
                }
            } else {
                await saveChannels(channelName as string, channel);
                msg.sender.sendMessage(`§2[§7Paradox§2]§o§7 You left channel '${channelName}§7'.`);

                for (const memberId in channel.Members) {
                    const member = PlayerCache.getPlayerById(memberId);
                    if (member && member.isValid) {
                        member.sendMessage(`§2[§7Paradox§2]§o§7 ${playerName} has left '${channelName}§7'.`);
                    }
                }
            }
        }

        /**
         * Creates a channel if the player is not already in a channel.
         * @param {string} channelName - The name of the channel to create.
         * @returns {Promise<void>}
         */
        async function createChannel(channelName: string): Promise<void> {
            if (msg.sender.getDynamicProperty("currentChannel")) {
                msg.sender.sendMessage(`§2[§7Paradox§2]§o§7 You are already in a channel. Please leave your current channel before creating a new one.`);
                return;
            }

            const channel = getChannel(channelName);
            if (channel) {
                msg.sender.sendMessage(`§o§c[Paradox] Channel '${channelName}§c' already exists.`);
            } else {
                await saveChannels(channelName, { Owner: playerName, Members: { [playerId]: playerName }, lastActive: Date.now() });
                msg.sender.setDynamicProperty("currentChannel", channelName);
                msg.sender.sendMessage(`§2[§7Paradox§2]§o§7 Channel '${channelName}§7' created.`);
            }
        }

        // Function to get the value associated with a flag
        function getFlagValue(args: string[], flag: string | string[]): string | undefined {
            const flagIndex = args.findIndex((arg) => (Array.isArray(flag) ? flag.includes(arg) : arg === flag));
            return flagIndex !== -1 ? args[flagIndex + 1] : undefined;
        }

        // Parse the command arguments
        const command = args[0];
        const roomName = getFlagValue(args, ["--room", "-r"])?.replace(/["@]/g, "");
        const targetName = getFlagValue(args, ["--target", "-t"])?.replace(/["@]/g, "");

        switch (command) {
            case "create": {
                if (roomName) {
                    await createChannel(roomName);
                } else {
                    message.sender.sendMessage(`§o§c[Paradox] Please specify a channel name using --room.`);
                }
                break;
            }

            case "join": {
                if (roomName) {
                    await joinChannel(roomName);
                } else {
                    message.sender.sendMessage(`§o§c[Paradox] Please specify a channel name using --room.`);
                }
                break;
            }

            case "invite": {
                if (roomName && targetName) {
                    await inviteToChannel(roomName, targetName);
                } else {
                    message.sender.sendMessage(`§o§c[Paradox] Please specify a channel name using --room and a target player using --target.`);
                }
                break;
            }

            case "leave": {
                await leaveChannel();
                break;
            }

            case "transfer": {
                if (roomName && targetName) {
                    await transferChannelOwnership(roomName, targetName);
                } else {
                    message.sender.sendMessage(`§o§c[Paradox] Please specify a channel name using --room and a target player using --target.`);
                }
                break;
            }

            case "help": {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${channelCommand.usage}`);
                break;
            }

            default: {
                message.sender.sendMessage(`§o§c[Paradox] Unknown command '${command}'.`);
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${channelCommand.usage}`);
                break;
            }
        }
    },
};
