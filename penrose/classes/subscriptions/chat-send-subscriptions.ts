import { world, system, ChatSendBeforeEvent, Player } from "@minecraft/server";
import { commandHandler, paradoxModulesDB, channelsDB } from "../../paradox";

// Configuration for spam detection
const SPAM_THRESHOLD = 5; // Number of allowed messages
const TIME_WINDOW = 100; // Time window in ticks (5 seconds at 20 ticks per second)
const MUTE_DURATION = 2400; // Mute duration in ticks (2 minutes)

interface PlayerSpamData {
    messageTimes: number[];
    mutedUntil: number | null;
}

/**
 * Handles chat send events, including spam detection and command processing.
 */
class ChatSendSubscription {
    private callback: ((event: ChatSendBeforeEvent) => void) | null;
    private spamData: Map<string, PlayerSpamData>;

    /**
     * Creates an instance of ChatSendSubscription.
     */
    constructor() {
        this.callback = null;
        this.spamData = new Map();
    }

    /**
     * Checks if spam detection is enabled based on the world dynamic properties.
     * @returns True if spam detection is enabled, false otherwise.
     */
    private isSpamCheckEnabled(): boolean {
        const paradoxModules = paradoxModulesDB.get("spamCheck_b");
        return paradoxModules === true;
    }

    /**
     * Checks if a player's dynamic property matches the specified value.
     * @param player - The player object to retrieve the dynamic property from.
     * @param propertyKey - The key of the dynamic property to check.
     * @param expectedValue - The value to compare the dynamic property against.
     * @returns True if the player's dynamic property matches the expected value, false otherwise.
     */
    private isPlayerPropertyEqual(player: Player, propertyKey: string, expectedValue: number): boolean {
        const propertyValue = player.getDynamicProperty(propertyKey) as number | null;
        return propertyValue === expectedValue;
    }

    /**
     * Retrieves the current channel of the player using channelsDB.
     * @param player - The player object.
     * @returns The name of the channel the player is in, or null if not in a channel.
     */
    private getPlayerChannel(player: Player): string | null {
        // Assuming channelsDB stores a map of channels where each member is keyed by player ID
        const channels = channelsDB.entries();
        for (const [channelName, channelData] of channels) {
            if (channelData.Members[player.id]) {
                return channelName;
            }
        }
        return null;
    }

    /**
     * Retrieves the list of players in a specific channel using channelsDB.
     * @param channelName - The name of the channel.
     * @returns A list of players in the channel.
     */
    private getPlayersInChannel(channelName: string): Player[] {
        const channelData = channelsDB.get(channelName) as { Members: { [key: string]: string } } | undefined;
        if (!channelData) return [];

        return Object.keys(channelData.Members)
            .map((playerId) => world.getAllPlayers().find((p) => p.id === playerId))
            .filter((p) => p !== undefined) as Player[];
    }

    /**
     * Subscribes to chat send events to handle spam detection and command processing.
     */
    subscribe() {
        if (this.callback === null) {
            this.callback = (event: ChatSendBeforeEvent) => {
                const player = event.sender;
                const playerId = player.id;
                const playerChannel = this.getPlayerChannel(player);

                if (this.isSpamCheckEnabled() && !this.isPlayerPropertyEqual(player, "securityClearance", 4)) {
                    const currentTick = system.currentTick;

                    const storedMutedUntil = player.getDynamicProperty("mutedUntil") as number | null;
                    const spamData = this.spamData.get(playerId) ?? { messageTimes: [], mutedUntil: storedMutedUntil };

                    if (spamData.mutedUntil && currentTick < spamData.mutedUntil) {
                        event.cancel = true;
                        const remainingMuteTime = Math.ceil((spamData.mutedUntil - currentTick) / 20); // in seconds
                        player.sendMessage(`§o§cYou are muted for spamming. Please wait ${remainingMuteTime} seconds before sending messages again.`);
                        return;
                    }

                    if (spamData.mutedUntil && currentTick >= spamData.mutedUntil) {
                        spamData.mutedUntil = null;
                        player.setDynamicProperty("mutedUntil"); // Clear the mute time
                    }

                    spamData.messageTimes = spamData.messageTimes.filter((time) => currentTick - time <= TIME_WINDOW);

                    spamData.messageTimes.push(currentTick);

                    if (spamData.messageTimes.length > SPAM_THRESHOLD) {
                        spamData.mutedUntil = currentTick + MUTE_DURATION;
                        player.setDynamicProperty("mutedUntil", spamData.mutedUntil); // Save mute time
                        event.cancel = true;
                        const muteDurationSeconds = Math.ceil(MUTE_DURATION / 20); // Convert ticks to seconds
                        player.sendMessage(`§o§cYou have been muted for spamming. Please wait ${muteDurationSeconds} seconds before sending messages again.`);
                        return;
                    }

                    this.spamData.set(playerId, spamData);
                }

                event.cancel = true;

                const playerRank = (player.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";
                const rank = playerChannel ?? playerRank;
                const formattedMessage = `${rank} §7${player.name}: §r${event.message}`;

                // Handle commands first; if not a command, broadcast the message
                if (commandHandler.handleCommand(event, player)) return;

                // Determine the target players based on the channel
                const targetPlayers = playerChannel ? this.getPlayersInChannel(playerChannel) : world.getPlayers();

                // Broadcast the message to the target players
                targetPlayers.forEach((p) => p.sendMessage(formattedMessage));
            };

            world.beforeEvents.chatSend.subscribe(this.callback);
        }
    }

    /**
     * Unsubscribes from chat send events to stop handling chat messages.
     */
    unsubscribe() {
        if (this.callback !== null) {
            world.beforeEvents.chatSend.unsubscribe(this.callback);
            this.callback = null;
        }
    }
}

export const chatSendSubscription = new ChatSendSubscription();
