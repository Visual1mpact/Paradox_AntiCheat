import { Player, ChatSendBeforeEvent, TicksPerSecond } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { channelsDB } from "../../paradox";

type PlayerID = string;

interface Channel {
    Owner: PlayerID;
    Members: Record<PlayerID, string>;
}

interface Invitation {
    sender: Player;
    channel: string;
    timeoutId: number;
}

const pendingInvitations = new Map<string, Invitation>();
const TIMEOUT_SECONDS = 30;
const TPS = TicksPerSecond;

/**
 * Represents the channel command.
 */
export const channelCommand: Command = {
    name: "channel",
    description: "Manage chat channels: create, join, invite, leave, and transfer ownership.",
    usage: `{prefix}channel <create | join | invite | leave | transfer | help>
            --room <name> [--target <player>]`,
    examples: [`{prefix}channel create --room <room>`, `{prefix}channel join --room <room>`, `{prefix}channel invite --room <room> --target <player>`, `{prefix}channel leave --room <room>`, `{prefix}channel transfer --room <room> --target <player>`],
    category: "Utility",
    securityClearance: 1,
    guiInstructions: {
        formType: "ActionFormData",
        title: "Channel Management",
        description: "Select an action to manage channels",
        commandOrder: "command-arg",
        actions: [
            { name: "Create Channel", command: ["create"], description: "Create a new chat channel", requiredFields: ["roomName"], crypto: false },
            { name: "Join Channel", command: ["join"], description: "Join an existing chat channel", requiredFields: ["roomName"], crypto: false },
            { name: "Invite to Channel", command: ["invite"], description: "Invite a player to a chat channel", requiredFields: ["roomName", "targetName"], crypto: false },
            { name: "Leave Channel", command: ["leave"], description: "Leave a chat channel", requiredFields: ["roomName"], crypto: false },
            { name: "Transfer Ownership", command: ["transfer"], description: "Transfer channel ownership", requiredFields: ["roomName", "targetName"], crypto: false },
        ],
        dynamicFields: [
            { name: "roomName", arg: "--room", type: "text", placeholder: "Enter channel name" },
            { name: "targetName", arg: "--target", type: "dropdown", placeholder: "Select player's name" },
        ],
    },

    /**
     * Executes the channel command.
     * @param {ChatSendBeforeEvent} message - The message object representing the chat event.
     * @param {string[]} args - The command arguments parsed from the chat message.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();
        const playerName = message.sender.name;
        const playerId = message.sender.id; // Get the player's ID

        /**
         * Retrieves a channel by its name.
         * @param {string} channelName - The name of the channel.
         * @returns {Channel | undefined} The channel object if found, otherwise undefined.
         */
        function getChannel(channelName: string): Channel | undefined {
            return channelsDB.get<Channel>(channelName);
        }

        /**
         * Saves the channels data to the database.
         */
        function saveChannels(channelName: string, channel: Channel): void {
            channelsDB.set(channelName, channel);
        }

        /**
         * Cancels an invitation if it exists.
         * @param {string} receiverName - The name of the player who received the invitation.
         */
        function cancelInvitation(receiverName: string): void {
            const invitation = pendingInvitations.get(receiverName);
            if (invitation) {
                minecraftEnvironment.getSystem().clearRun(invitation.timeoutId);
                pendingInvitations.delete(receiverName);
            }
        }

        /**
         * Joins a channel if the player is not already in a channel.
         * @param {string} channelName - The name of the channel to join.
         */
        function joinChannel(channelName: string): void {
            const channels = getChannel(channelName);
            if (channels && channels.Members[playerId]) {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 You are already in a channel.`);
                return;
            }

            const channel = getChannel(channelName);
            if (!channel) {
                message.sender.sendMessage(`§cChannel '${channelName}§c' does not exist.`);
                return;
            }

            channel.Members[playerId] = playerName;
            saveChannels(channelName, channel);
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 You have joined channel '${channelName}§7'.`);

            // Notify other members of the new player
            for (const memberId in channel.Members) {
                const member = world.getAllPlayers().find((player) => player.id === memberId);
                if (member && member.name !== playerName) {
                    member.sendMessage(`§2[§7Paradox§2]§o§7 ${playerName} has joined channel '${channelName}§7'.`);
                }
            }
        }

        /**
         * Sends an invitation to a player to join a channel.
         * @param {string} channelName - The name of the channel.
         * @param {string} receiverName - The name of the player to invite.
         */
        function inviteToChannel(channelName: string, receiverName: string): void {
            const receiver = world.getAllPlayers().find((player) => player.name === receiverName);
            if (!receiver) {
                message.sender.sendMessage(`§cPlayer '${receiverName}' not found.`);
                return;
            }

            if (pendingInvitations.has(receiverName)) {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiverName} is already handling an invitation.`);
                return;
            }

            const channel = getChannel(channelName);
            if (!channel) {
                message.sender.sendMessage(`§cChannel '${channelName}§c' does not exist.`);
                return;
            }

            const timeoutId = minecraftEnvironment.getSystem().runTimeout(() => {
                cancelInvitation(receiverName);
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 ${receiverName} did not respond in time. Invitation canceled.`);
                receiver.sendMessage(`§2[§7Paradox§2]§o§7 You did not respond to the channel invitation in time. Invitation canceled.`);
            }, TIMEOUT_SECONDS * TPS);

            pendingInvitations.set(receiverName, { sender: message.sender, channel: channelName, timeoutId });
            receiver.sendMessage(
                `§2[§7Paradox§2]§o§7 ${message.sender.name} invited you to join channel '${channelName}§7'. Type ${world.getDynamicProperty("__prefix") ?? "!"}channel join --room ${channelName}§7 to join or ${world.getDynamicProperty("__prefix") ?? "!"}channel leave --room ${channelName}§7 to decline.`
            );
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Invitation sent to ${receiverName} to join channel '${channelName}§7'.`);
        }

        /**
         * Transfers ownership of a channel to a new player.
         * @param {string} channelName - The name of the channel.
         * @param {string} newOwnerName - The name of the new owner.
         */
        function transferChannelOwnership(channelName: string, newOwnerName: string): void {
            const channel = getChannel(channelName);
            if (!channel) {
                message.sender.sendMessage(`§cChannel '${channelName}§c' does not exist.`);
                return;
            }

            if (channel.Owner !== playerName) {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 You are not the owner of channel '${channelName}§7'.`);
                return;
            }

            const newOwner = world.getAllPlayers().find((player) => player.name === newOwnerName);
            if (!newOwner) {
                message.sender.sendMessage(`§cPlayer '${newOwnerName}§c' not found.`);
                return;
            }

            channel.Owner = newOwnerName;
            saveChannels(channelName, channel);
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Ownership of channel '${channelName}§7' transferred to ${newOwnerName}.`);
            newOwner.sendMessage(`§2[§7Paradox§2]§o§7 You are now the owner of channel '${channelName}§7'.`);
        }

        /**
         * Allows a player to leave a channel.
         * @param {string} channelName - The name of the channel to leave.
         */
        function leaveChannel(channelName: string): void {
            const channel = getChannel(channelName);
            if (!channel) {
                message.sender.sendMessage(`§cChannel '${channelName}§c' does not exist.`);
                return;
            }

            if (channel.Owner === playerName) {
                if (Object.keys(channel.Members).length > 1) {
                    // Find the next member to transfer ownership to
                    const newOwnerId = Object.keys(channel.Members).find((id) => id !== playerId);
                    if (newOwnerId) {
                        const newOwnerName = channel.Members[newOwnerId];
                        channel.Owner = newOwnerName;

                        // Notify all members of the ownership change
                        for (const memberId in channel.Members) {
                            const member = world.getAllPlayers().find((player) => player.id === memberId);
                            if (member) {
                                member.sendMessage(`§2[§7Paradox§2]§o§7 The owner of channel '${channelName}§7' has left. ${newOwnerName} is now the new owner.`);
                            }
                        }

                        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 You have left channel '${channelName}§7'. Ownership has been transferred to ${newOwnerName}.`);
                        saveChannels(channelName, channel);
                        return;
                    } else {
                        // No other members to transfer ownership to
                        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Channel '${channelName}§7' was empty and has been deleted.`);
                        channelsDB.delete(channelName);
                        return;
                    }
                } else {
                    // Only owner left in the channel, delete the channel
                    message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Channel '${channelName}§7' has been deleted since you were the only member.`);
                    channelsDB.delete(channelName);
                    return;
                }
            }

            if (channel.Members[playerId]) {
                delete channel.Members[playerId];
                if (Object.keys(channel.Members).length === 0) {
                    channelsDB.delete(channelName);
                    message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Channel '${channelName}§7' was empty and has been deleted.`);
                } else {
                    message.sender.sendMessage(`§2[§7Paradox§2]§o§7 You have left channel '${channelName}§7'.`);
                }
                saveChannels(channelName, channel);
            } else {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 You are not a member of channel '${channelName}§7'.`);
            }
        }

        /**
         * Creates a channel if the player is not already in a channel.
         * @param {string} channelName - The name of the channel to create.
         */
        function createChannel(channelName: string): void {
            const channels = channelsDB.entries() as [string, Channel][]; // Explicitly type the entries as [string, Channel][]
            if (channels.some(([, channel]: [string, Channel]) => channel.Members?.[playerId])) {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 You are already in a channel. Please leave your current channel before creating a new one.`);
                return;
            }

            const channel = channelsDB.get<Channel>(channelName); // Ensure the type of the channel
            if (channel) {
                message.sender.sendMessage(`§cChannel '${channelName}§c' already exists.`);
            } else {
                saveChannels(channelName, { Owner: playerName, Members: { [playerId]: playerName } });
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Channel '${channelName}§7' created.`);
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
            case "create":
                if (roomName) {
                    createChannel(roomName);
                } else {
                    message.sender.sendMessage(`§cPlease specify a channel name using --room.`);
                }
                break;

            case "join":
                if (roomName) {
                    joinChannel(roomName);
                } else {
                    message.sender.sendMessage(`§cPlease specify a channel name using --room.`);
                }
                break;

            case "invite":
                if (roomName && targetName) {
                    inviteToChannel(roomName, targetName);
                } else {
                    message.sender.sendMessage(`§cPlease specify a channel name using --room and a target player using --target.`);
                }
                break;

            case "leave":
                if (roomName) {
                    leaveChannel(roomName);
                } else {
                    message.sender.sendMessage(`§cPlease specify a channel name using --room.`);
                }
                break;

            case "transfer":
                if (roomName && targetName) {
                    transferChannelOwnership(roomName, targetName);
                } else {
                    message.sender.sendMessage(`§cPlease specify a channel name using --room and a target player using --target.`);
                }
                break;

            case "help":
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${channelCommand.usage}`);
                break;

            default:
                message.sender.sendMessage(`§cUnknown command '${command}'.`);
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${channelCommand.usage}`);
                break;
        }
    },
};
