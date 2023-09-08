import { Player } from "@minecraft/server";
import { PlayerManager } from "./PlayerManager";

/**
 * Define the ChatChannel type.
 */
type ChatChannel = {
    owner: string;
    password: string;
    members: Set<string>;
};

/**
 * Define the PlayerChannelMap type.
 */
type PlayerChannelMap = {
    [playerName: string]: string | null;
};

/**
 * ChatChannelManager class for managing chat channels and players.
 */
export class ChatChannelManager {
    /**
     * Stores chat channels by name.
     */
    private static chatChannels: { [channelName: string]: ChatChannel } = {};

    /**
     * Maps players to their chat channels.
     */
    private static playerChannelMap: PlayerChannelMap = {};

    /**
     * Create a new chat channel.
     * @param channelName The name of the chat channel.
     * @param password The channel password.
     * @param owner The owner of the chat channel.
     * @returns True if the channel is created successfully, false otherwise.
     */
    public static createChatChannel(channelName: string, password: string, owner: string): boolean {
        const player = this.getPlayerByName(owner);
        if (!this.chatChannels[channelName] && player) {
            const existingChannel = Object.values(this.chatChannels).find((channel) => channel.members.has(player.id));
            if (existingChannel) {
                return false;
            }

            const newChannel: ChatChannel = {
                owner: player.id,
                password,
                members: new Set([player.id]),
            };
            this.chatChannels[channelName] = newChannel;
            this.playerChannelMap[player.id] = channelName;
            return true;
        }
        return false;
    }

    /**
     * Invite a player to a chat channel.
     * @param playerName The name of the player to invite.
     * @param channelName The name of the chat channel.
     * @returns True if the player is invited successfully, false otherwise.
     */
    public static inviteToChatChannel(playerName: string, channelName: string): boolean {
        const chatChannel = this.chatChannels[channelName];
        const playerObject = this.getPlayerByName(playerName);
        if (chatChannel && playerObject && !chatChannel.members.has(playerObject.id)) {
            chatChannel.members.add(playerObject.id);
            this.playerChannelMap[playerObject.id] = channelName;
            return true;
        }
        return false;
    }

    /**
     * Switch a player to a different chat channel.
     * @param playerName The name of the player.
     * @param channelName The name of the new chat channel.
     * @param password The channel password (optional).
     * @returns The new channel name if the switch is successful, or a string indicating an error.
     */
    public static switchChatChannel(playerName: string, channelName: string, password?: string): string | boolean {
        const channel = this.chatChannels[channelName];
        if (channel) {
            if (channel.password && password !== channel.password) {
                return "wrong_password";
            }

            if (channel.members.has(playerName)) {
                return "already_in_channel";
            }

            const previousChannelName = this.playerChannelMap[playerName];
            if (previousChannelName) {
                const previousChannel = this.chatChannels[previousChannelName];
                if (previousChannel) {
                    previousChannel.members.delete(playerName);
                }
            }

            channel.members.add(playerName);
            this.playerChannelMap[playerName] = channelName;

            if (channel.owner === null) {
                channel.owner = playerName;
            }

            return channelName;
        }
        return false;
    }

    /**
     * Get the chat channel of a player.
     * @param playerName The name of the player.
     * @returns The name of the player's chat channel, or null if not in a channel.
     */
    public static getPlayerChannel(playerName: string): string | null {
        return this.playerChannelMap[playerName] || null;
    }

    /**
     * Get a player by their name.
     * @param playerName The name of the player.
     * @returns The player with the specified name, or null if not found.
     */
    public static getPlayerByName(playerName: string): Player | null {
        return PlayerManager.getPlayerByName(playerName.toLowerCase().replace(/"|\\|@/g, "")) || null;
    }

    /**
     * Get a player by their ID.
     * @param playerId The ID of the player.
     * @returns The player with the specified ID, or null if not found.
     */
    public static getPlayerById(playerId: string): Player | null {
        return PlayerManager.getPlayerById(playerId) || null;
    }

    /**
     * List all chat channels and their password status.
     * @returns An array of channel names and their password status.
     */
    public static listChatChannels(): { channelName: string; hasPassword: boolean }[] {
        const channelList: { channelName: string; hasPassword: boolean }[] = [];

        for (const channelName in this.chatChannels) {
            const channel = this.chatChannels[channelName];
            const hasPassword = !!channel.password;

            channelList.push({
                channelName,
                hasPassword,
            });
        }

        return channelList;
    }

    /**
     * Check if a password is required for a chat channel.
     * @param channelName The name of the chat channel.
     * @returns True if a password is required, false otherwise.
     */
    public static isPasswordRequired(channelName: string): boolean {
        const channel = this.chatChannels[channelName];
        return !!channel && !!channel.password;
    }

    /**
     * Get a chat channel by its name.
     * @param channelName The name of the chat channel.
     * @returns The chat channel object, or null if not found.
     */
    public static getChatChannelByName(channelName: string): ChatChannel | null {
        return this.chatChannels[channelName] || null;
    }
}
