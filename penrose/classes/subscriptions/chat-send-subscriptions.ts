import { world, system, ChatSendBeforeEvent, Player } from "@minecraft/server";
import { commandHandler, paradoxModulesDB, channelsDB } from "../../event-listeners/world-initialize";

// Configuration for spam detection
const SPAM_THRESHOLD = 5; // Number of allowed messages
const TIME_WINDOW = 100; // Time window in ticks (5 seconds at 20 ticks per second)
const MUTE_DURATION = 2400; // Mute duration in ticks (2 minutes)

interface PlayerSpamData {
    messageTimes: number[];
    mutedUntil: number | null;
}

type PlayerID = string;

interface Channel {
    Owner: PlayerID;
    Members: Record<PlayerID, string>;
    lastActive: number; // store `Date.now()` timestamp
}

/**
 * Handles chat send events, including spam detection and command processing.
 */
class ChatSendSubscription {
    private callback: ((event: ChatSendBeforeEvent) => void) | null;
    private spamData: Map<string, PlayerSpamData>;
    private channelMemberCache: Map<string, { memberSet: Set<string>; lastUpdated: number }>;

    constructor() {
        this.callback = null;
        this.spamData = new Map();
        this.channelMemberCache = new Map();
    }

    private isSpamCheckEnabled(): boolean {
        return paradoxModulesDB.get("spamCheck_b")?.enabled === true;
    }

    private isPlayerPropertyEqual(player: Player, propertyKey: string, expectedValue: number): boolean {
        const value = player.isValid ? (player.getDynamicProperty(propertyKey) as number | null) : null;
        return value === expectedValue;
    }

    private getPlayerChannel(player: Player): string | null {
        const channels = channelsDB.entries() as [string, Channel][];
        for (const [channelName, channelData] of channels) {
            if (channelData.Members[player.id]) return channelName;
        }
        return null;
    }

    subscribe() {
        if (this.callback) return;

        this.callback = async (event: ChatSendBeforeEvent) => {
            const player = event.sender;
            const playerId = player.id;
            const playerChannel = this.getPlayerChannel(player);
            const currentTick = system.currentTick;

            // 1️⃣ Spam detection
            if (this.isSpamCheckEnabled() && !this.isPlayerPropertyEqual(player, "securityClearance", 4)) {
                const storedMutedUntil = player.getDynamicProperty("mutedUntil") as number | null;
                const spamData = this.spamData.get(playerId) ?? { messageTimes: [], mutedUntil: storedMutedUntil };

                if (spamData.mutedUntil && currentTick < spamData.mutedUntil) {
                    event.cancel = true;
                    const remainingSec = Math.ceil((spamData.mutedUntil - currentTick) / 20);
                    player.sendMessage(`§o§c[Paradox] You are muted for spamming. Wait ${remainingSec}s.`);
                    return;
                }

                if (spamData.mutedUntil && currentTick >= spamData.mutedUntil) {
                    spamData.mutedUntil = null;
                    player.setDynamicProperty("mutedUntil");
                }

                // Remove old message times
                spamData.messageTimes = spamData.messageTimes.filter((t) => currentTick - t <= TIME_WINDOW);
                spamData.messageTimes.push(currentTick);

                if (spamData.messageTimes.length > SPAM_THRESHOLD) {
                    spamData.mutedUntil = currentTick + MUTE_DURATION;
                    player.setDynamicProperty("mutedUntil", spamData.mutedUntil);
                    event.cancel = true;
                    const muteSec = Math.ceil(MUTE_DURATION / 20);
                    player.sendMessage(`§o§c[Paradox] You have been muted for spamming. Wait ${muteSec}s.`);
                    return;
                }

                this.spamData.set(playerId, spamData);
            }

            // 2️⃣ Command handling
            const prefix = (world.getDynamicProperty("__prefix") as string) || "!";
            if (event.message.startsWith(prefix)) {
                event.cancel = true;
                commandHandler.handleCommand(event, player, prefix);
                return;
            }

            // 3️⃣ Chat rank/global handling
            const isRankDisabled = world.getDynamicProperty("globalRankDisabled");
            if (isRankDisabled && !playerChannel) return; // allow normal message

            event.cancel = true;
            const playerRank = (player.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";
            const rank = playerChannel ?? playerRank;
            const formattedMessage = `${rank} §7${player.name}§7: §r${event.message}`;

            // 4️⃣ Determine target players
            let targetPlayers: Player[];
            if (playerChannel) {
                const channelData = channelsDB.get(playerChannel);
                if (channelData) {
                    const now = Date.now();
                    const DEBOUNCE_INTERVAL = 5000;

                    // Debounce lastActive update
                    if (!channelData.lastActive || now - channelData.lastActive > DEBOUNCE_INTERVAL) {
                        channelData.lastActive = now;
                        await channelsDB.set(playerChannel, channelData);
                    }

                    // Use cached member set
                    const cacheEntry = this.channelMemberCache.get(playerChannel);
                    let memberSet = cacheEntry?.memberSet;

                    if (!cacheEntry || now - (cacheEntry.lastUpdated ?? 0) > DEBOUNCE_INTERVAL) {
                        memberSet = new Set(Object.keys(channelData.Members));
                        this.channelMemberCache.set(playerChannel, { memberSet, lastUpdated: now });
                    }

                    targetPlayers = world.getAllPlayers().filter((p) => memberSet!.has(p.id));
                } else {
                    targetPlayers = world.getPlayers();
                }
            } else {
                targetPlayers = world.getPlayers();
            }

            // 5️⃣ Broadcast message
            targetPlayers.forEach((p) => p.sendMessage(formattedMessage));
        };

        world.beforeEvents.chatSend.subscribe(this.callback);
    }

    unsubscribe() {
        if (!this.callback) return;
        world.beforeEvents.chatSend.unsubscribe(this.callback);
        this.callback = null;
    }
}

export const chatSendSubscription = new ChatSendSubscription();
