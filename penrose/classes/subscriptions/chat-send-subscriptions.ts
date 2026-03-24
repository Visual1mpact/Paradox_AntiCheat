import { world, system, ChatSendBeforeEvent, Player } from "@minecraft/server";
import { commandHandler, paradoxModulesDB, channelsDB } from "../../event-listeners/world-initialize";
import { PlayerCache } from "../player-cache";

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

    private isSpamCheckEnabled(): boolean {
        return paradoxModulesDB.get("spamCheck_b")?.enabled === true;
    }

    private isPlayerPropertyEqual(player: Player, propertyKey: string, expectedValue: number): boolean {
        const value = player.isValid ? (player.getDynamicProperty(propertyKey) as number | undefined) : undefined;
        return value === expectedValue;
    }

    private getPlayerChannel(player: Player): string | undefined {
        const channels = channelsDB.entries() as [string, Channel][];
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
            const playerChannel = this.getPlayerChannel(player);
            const currentTick = system.currentTick;

            // 1️⃣ Spam detection
            if (this.isSpamCheckEnabled() && !this.isPlayerPropertyEqual(player, "securityClearance", 4)) {
                let tracker = this.spamData.get(playerId);

                if (!tracker) {
                    tracker = new SpamTracker();
                    tracker.mutedUntil = player.getDynamicProperty("mutedUntil") as number | undefined;
                    this.spamData.set(playerId, tracker);
                }

                // actively muted
                if (tracker.mutedUntil && currentTick < tracker.mutedUntil) {
                    event.cancel = true;

                    const remainingSec = Math.ceil((tracker.mutedUntil - currentTick) / 20);

                    player.sendMessage(`§o§c[Paradox] You are muted for spamming. Wait ${remainingSec}s.`);

                    return;
                }

                const isSpam = tracker.recordMessage(currentTick);

                if (isSpam) {
                    event.cancel = true;

                    player.setDynamicProperty("mutedUntil", tracker.mutedUntil);

                    const muteSec = Math.ceil(MUTE_DURATION / 20);

                    player.sendMessage(`§o§c[Paradox] You have been muted for spamming. Wait ${muteSec}s.`);

                    return;
                }

                // clear stored mute once expired
                if (tracker.mutedUntil === undefined) {
                    player.setDynamicProperty("mutedUntil", undefined);
                }

                // cleanup once fully inactive
                if (tracker.isFullyInactive()) {
                    this.spamData.delete(playerId);
                }
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

            if (isRankDisabled && !playerChannel) return;

            event.cancel = true;

            const playerRank = (player.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";

            const rank = playerChannel ?? playerRank;

            const formattedMessage = `${rank} §7${player.name}§7: §r${event.message}`;

            // 4️⃣ Determine target players
            if (playerChannel) {
                const channelData = channelsDB.get(playerChannel);

                if (channelData) {
                    const now = Date.now();
                    const DEBOUNCE_INTERVAL = 5000;

                    // debounce lastActive writes
                    if (!channelData.lastActive || now - channelData.lastActive > DEBOUNCE_INTERVAL) {
                        channelData.lastActive = now;

                        system.run(() => {
                            channelsDB.set(playerChannel, channelData);
                        });
                    }

                    // cached member set
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
                    // fallback global broadcast
                    for (const p of PlayerCache.getPlayers()) {
                        p.sendMessage(formattedMessage);
                    }
                }
            } else {
                // global broadcast
                for (const p of PlayerCache.getPlayers()) {
                    p.sendMessage(formattedMessage);
                }
            }
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
