import { world, system, ChatSendBeforeEvent, Player } from "@minecraft/server";
import { commandHandler, paradoxModulesDB, channelsDB } from "../../event-listeners/world-initialize";
import { PlayerCache } from "../cache/player-cache";
import { EventCoordinator } from "../core/event-coordinator";

// Configuration for spam detection
const SPAM_THRESHOLD = 5; // Number of allowed messages
const TIME_WINDOW = 100; // Time window in ticks (5 seconds at 20 ticks per second)
const MUTE_DURATION = 2400; // Mute duration in ticks (2 minutes)

type PlayerID = string;

interface Channel {
    Owner: PlayerID;
    Members: Record<PlayerID, string>;
    lastActive: number; // store `Date.now()` timestamp
}

/**
 * Zero-allocation spam tracker using a circular buffer.
 */
class SpamTracker {
    private buffer: Uint32Array;
    private index = 0;
    private count = 0;
    mutedUntil: number | undefined = undefined;

    constructor() {
        this.buffer = new Uint32Array(SPAM_THRESHOLD + 1);
    }

    recordMessage(currentTick: number): boolean {
        if (this.mutedUntil !== undefined && currentTick < this.mutedUntil) {
            return true;
        }

        if (this.mutedUntil !== undefined && currentTick >= this.mutedUntil) {
            this.mutedUntil = undefined;
            this.count = 0;
        }

        this.buffer[this.index] = currentTick;

        if (++this.index === this.buffer.length) {
            this.index = 0;
        }

        if (this.count < this.buffer.length) {
            this.count++;
        }

        if (this.count > SPAM_THRESHOLD) {
            const oldestTick = this.buffer[this.index];

            if (currentTick - oldestTick <= TIME_WINDOW) {
                this.mutedUntil = currentTick + MUTE_DURATION;
                return true;
            }
        }

        return false;
    }

    isFullyInactive(): boolean {
        return this.mutedUntil === undefined && this.count === 0;
    }
}

/**
 * Handles chat send events, including spam detection and command processing.
 */
class ChatSendSubscription {
    private callback: ((event: ChatSendBeforeEvent) => void) | null;
    private spamData: Map<string, SpamTracker>;
    private channelMemberCache: Map<string, { memberSet: Set<string>; lastUpdated: number }>;

    constructor() {
        this.callback = null;
        this.spamData = new Map();
        this.channelMemberCache = new Map();
    }

    private async isSpamCheckEnabled(): Promise<boolean> {
        const mod = await paradoxModulesDB.get("spamCheck_b");
        return mod?.enabled === true;
    }

    private isPlayerPropertyEqual(player: Player, propertyKey: string, expectedValue: number): boolean {
        const value = player?.isValid ? (player.getDynamicProperty(propertyKey) as number | undefined) : undefined;
        return value === expectedValue;
    }

    private async getPlayerChannel(player: Player): Promise<string | undefined> {
        const entries = await channelsDB.entries();
        const channels = entries as unknown as [string, Channel][];
        for (const [channelName, channelData] of channels) {
            if (channelData.Members[player.id]) return channelName;
        }
        return undefined;
    }

    subscribe() {
        if (this.callback) return;

        this.callback = async (event: ChatSendBeforeEvent) => {
            const player = event.sender;
            const playerId = player.id;
            const currentTick = system.currentTick;
            const prefix = (world.getDynamicProperty("__prefix") as string) || ":";

            // Cancel synchronously right away so vanilla chat does NOT process it.
            event.cancel = true;

            // 1️⃣ Fast synchronous command check
            if (event.message.startsWith(prefix)) {
                commandHandler.handleCommand(event, player, prefix);
                return;
            }

            // 2️⃣ Fast synchronous mute check
            const isMuted = player.getDynamicProperty("isMuted") as boolean;
            if (isMuted) {
                player.sendMessage("§o§c[Paradox] You are currently muted and cannot send messages.");
                return;
            }

            // Asynchronous checks
            const playerChannel = await this.getPlayerChannel(player);

            // 3️⃣ Spam detection
            if ((await this.isSpamCheckEnabled()) && !this.isPlayerPropertyEqual(player, "securityClearance", 4)) {
                let tracker = this.spamData.get(playerId);

                if (!tracker) {
                    tracker = new SpamTracker();
                    tracker.mutedUntil = player.getDynamicProperty("mutedUntil") as number | undefined;
                    this.spamData.set(playerId, tracker);
                }

                // Actively muted
                if (tracker.mutedUntil && currentTick < tracker.mutedUntil) {
                    const remainingSec = Math.ceil((tracker.mutedUntil - currentTick) / 20);
                    player.sendMessage(`§o§c[Paradox] You are muted for spamming. Wait ${remainingSec}s.`);
                    return;
                }

                const isSpam = tracker.recordMessage(currentTick);

                if (isSpam) {
                    player.setDynamicProperty("mutedUntil", tracker.mutedUntil);
                    const muteSec = Math.ceil(MUTE_DURATION / 20);
                    player.sendMessage(`§o§c[Paradox] You have been muted for spamming. Wait ${muteSec}s.`);
                    return;
                }

                // Clear stored mute once expired
                if (tracker.mutedUntil === undefined) {
                    player.setDynamicProperty("mutedUntil", undefined);
                }

                // Cleanup once fully inactive
                if (tracker.isFullyInactive()) {
                    this.spamData.delete(playerId);
                }
            }

            // 4️⃣ Chat rank/global/alias handling
            const isRankDisabled = (world.getDynamicProperty("globalRankDisabled") as boolean | undefined) ?? false;
            const alias = player.getDynamicProperty("paradoxAlias") as string | undefined;

            const playerRank = (player.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";

            // Fix: Explicitly preserve channel tag if in a channel, otherwise respect isRankDisabled
            const rank = playerChannel ?? (isRankDisabled ? "" : playerRank);
            const displayName = alias ?? player.name;
            const formattedMessage = rank ? `${rank} §7${displayName}§7: §r${event.message}` : `§7${displayName}§7: §r${event.message}`;

            // 5️⃣ Determine target players and broadcast custom chat
            if (playerChannel) {
                const channelData = (await channelsDB.get(playerChannel)) as Channel | undefined;

                if (channelData) {
                    const now = Date.now();
                    const DEBOUNCE_INTERVAL = 5000;

                    if (!channelData.lastActive || now - channelData.lastActive > DEBOUNCE_INTERVAL) {
                        channelData.lastActive = now;
                        await channelsDB.set(playerChannel, channelData);
                    }

                    const cacheEntry = this.channelMemberCache.get(playerChannel);
                    let memberSet: Set<string>;

                    if (!cacheEntry || now - cacheEntry.lastUpdated > DEBOUNCE_INTERVAL) {
                        memberSet = new Set(Object.keys(channelData.Members));
                        this.channelMemberCache.set(playerChannel, {
                            memberSet,
                            lastUpdated: now,
                        });
                    } else {
                        memberSet = cacheEntry.memberSet;
                    }

                    for (const p of PlayerCache.filterByIds(memberSet)) {
                        p.sendMessage(formattedMessage);
                    }
                } else {
                    for (const p of PlayerCache.getPlayers()) {
                        p.sendMessage(formattedMessage);
                    }
                }
            } else {
                for (const p of PlayerCache.getPlayers()) {
                    p.sendMessage(formattedMessage);
                }
            }
        };

        EventCoordinator.subscribeBefore("chatSend", this.callback);
    }

    unsubscribe() {
        if (!this.callback) return;

        EventCoordinator.unsubscribeBefore("chatSend", this.callback);

        this.callback = null;
    }
}

export const chatSendSubscription = new ChatSendSubscription();
