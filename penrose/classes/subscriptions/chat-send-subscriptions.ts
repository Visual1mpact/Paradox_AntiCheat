import { world, system, ChatSendBeforeEvent, Player } from "@minecraft/server";
import { commandHandler, paradoxModulesDB, channelsDB } from "../../event-listeners/world-initialize";
import { PlayerCache } from "../cache/player-cache";
import { EventCoordinator } from "../core/event-coordinator";

const SPAM_THRESHOLD = 5;
const TIME_WINDOW = 100;
const MUTE_DURATION = 2400;
const CHANNEL_CACHE_TTL = 5000;

type PlayerID = string;

interface Channel {
    Owner: PlayerID;
    Members: Record<PlayerID, string>;
    lastActive: number;
}

interface ChannelCacheEntry {
    memberSet: Set<string>;
    lastUpdated: number;
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

    /**
     * Checks whether the current player tick should be considered a spam offense.
     *
     * @param {number} currentTick - Current world tick count.
     * @returns {boolean} True if muted or triggering spam limits, false otherwise.
     */
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

            if (oldestTick !== undefined && currentTick - oldestTick <= TIME_WINDOW) {
                this.mutedUntil = currentTick + MUTE_DURATION;
                return true;
            }
        }

        return false;
    }

    /**
     * Evaluates if tracker state has completely reset.
     *
     * @returns {boolean} True when inactive.
     */
    isFullyInactive(): boolean {
        return this.mutedUntil === undefined && this.count === 0;
    }
}

/**
 * Checks if spam module protection is enabled.
 *
 * @returns {Promise<boolean>} True if enabled.
 */
async function isSpamCheckEnabled(): Promise<boolean> {
    const mod = await paradoxModulesDB.get("spamCheck_b");
    return mod?.enabled === true;
}

/**
 * Evaluates whether a player dynamic property matches expected numerical value.
 *
 * @param {Player} player - Target player.
 * @param {string} propertyKey - Property metadata key.
 * @param {number} expectedValue - Value expected for match.
 * @returns {boolean} Match truth status.
 */
function isPlayerPropertyEqual(player: Player, propertyKey: string, expectedValue: number): boolean {
    const value = player?.isValid ? (player.getDynamicProperty(propertyKey) as number | undefined) : undefined;
    return value === expectedValue;
}

/**
 * Searches current active channels for player's membership.
 *
 * @param {Player} player - Executing player.
 * @returns {Promise<string | undefined>} Name of player's active channel if found.
 */
async function getPlayerChannel(player: Player): Promise<string | undefined> {
    const entries = await channelsDB.entries();
    const channels = entries as unknown as [string, Channel][];
    for (const [channelName, channelData] of channels) {
        if (channelData.Members[player.id]) return channelName;
    }
    return undefined;
}

/**
 * Formats chat output using assigned player rank or channel status.
 *
 * @param {Player} player - Sender entity instance.
 * @param {string | undefined} playerChannel - Channel identifier.
 * @param {string} rawMessage - Message text.
 * @returns {string} Formatted output string.
 */
function formatChatMessage(player: Player, playerChannel: string | undefined, rawMessage: string): string {
    const isRankDisabled = (world.getDynamicProperty("globalRankDisabled") as boolean | undefined) ?? false;
    const alias = player.getDynamicProperty("paradoxAlias") as string | undefined;
    const playerRank = (player.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";

    const rank = playerChannel ?? (isRankDisabled ? "" : playerRank);
    const displayName = alias ?? player.name;

    return rank ? `${rank} §7${displayName}§7: §r${rawMessage}` : `§7${displayName}§7: §r${rawMessage}`;
}

/**
 * Broadcasts messages to all online server players.
 *
 * @param {string} message - Content to broadcast.
 */
function broadcastGlobalMessage(message: string): void {
    for (const p of PlayerCache.getPlayers()) {
        p.sendMessage(message);
    }
}

/**
 * Evaluates spam rules for non-exempt players.
 *
 * @param {Player} player - Event sender player.
 * @param {Map<string, SpamTracker>} spamMap - In-memory spam tracker state repository.
 * @returns {Promise<boolean>} True if action was blocked/handled due to spam logic.
 */
async function handleSpamValidation(player: Player, spamMap: Map<string, SpamTracker>): Promise<boolean> {
    if (!(await isSpamCheckEnabled()) || isPlayerPropertyEqual(player, "securityClearance", 4)) {
        return false;
    }

    const playerId = player.id;
    const currentTick = system.currentTick;
    let tracker = spamMap.get(playerId);

    if (!tracker) {
        tracker = new SpamTracker();
        tracker.mutedUntil = player.getDynamicProperty("mutedUntil") as number | undefined;
        spamMap.set(playerId, tracker);
    }

    if (tracker.mutedUntil && currentTick < tracker.mutedUntil) {
        const remainingSec = Math.ceil((tracker.mutedUntil - currentTick) / 20);
        player.sendMessage(`§o§c[Paradox] You are muted for spamming. Wait ${remainingSec}s.`);
        return true;
    }

    const isSpam = tracker.recordMessage(currentTick);

    if (isSpam) {
        player.setDynamicProperty("mutedUntil", tracker.mutedUntil);
        const muteSec = Math.ceil(MUTE_DURATION / 20);
        player.sendMessage(`§o§c[Paradox] You have been muted for spamming. Wait ${muteSec}s.`);
        return true;
    }

    if (tracker.mutedUntil === undefined) {
        player.setDynamicProperty("mutedUntil", undefined);
    }

    if (tracker.isFullyInactive()) {
        spamMap.delete(playerId);
    }

    return false;
}

/**
 * Updates channel active timestamps based on last active intervals.
 *
 * @param {string} channelName - Database channel target key.
 * @param {Channel} channelData - Loaded instance of target channel.
 * @param {number} now - Epoch millisecond timestamp.
 */
async function refreshChannelActivity(channelName: string, channelData: Channel, now: number): Promise<void> {
    if (!channelData.lastActive || now - channelData.lastActive > CHANNEL_CACHE_TTL) {
        channelData.lastActive = now;
        await channelsDB.set(channelName, channelData);
    }
}

/**
 * Retrieves or builds cached membership set for target channel rooms.
 *
 * @param {string} channelName - Channel identifier.
 * @param {Channel} channelData - DB object instance.
 * @param {Map<string, ChannelCacheEntry>} cacheMap - Memory caching instance.
 * @param {number} now - Epoch millisecond timestamp.
 * @returns {Set<string>} Active set of string member IDs.
 */
function getChannelMemberSet(channelName: string, channelData: Channel, cacheMap: Map<string, ChannelCacheEntry>, now: number): Set<string> {
    const cacheEntry = cacheMap.get(channelName);
    if (!cacheEntry || now - cacheEntry.lastUpdated > CHANNEL_CACHE_TTL) {
        const memberSet = new Set(Object.keys(channelData.Members));
        cacheMap.set(channelName, { memberSet, lastUpdated: now });
        return memberSet;
    }
    return cacheEntry.memberSet;
}

/**
 * Handles target room recipient dispatching for channel bound chat operations.
 *
 * @param {string} channelName - Target room name key.
 * @param {string} formattedMessage - Fully structured string payload.
 * @param {Map<string, ChannelCacheEntry>} cacheMap - Target channel member memory cache repository.
 */
async function handleChannelBroadcast(channelName: string, formattedMessage: string, cacheMap: Map<string, ChannelCacheEntry>): Promise<void> {
    const channelData = (await channelsDB.get(channelName)) as Channel | undefined;
    if (!channelData) {
        broadcastGlobalMessage(formattedMessage);
        return;
    }

    const now = Date.now();
    await refreshChannelActivity(channelName, channelData, now);

    const memberSet = getChannelMemberSet(channelName, channelData, cacheMap, now);
    for (const p of PlayerCache.filterByIds(memberSet)) {
        p.sendMessage(formattedMessage);
    }
}

/**
 * Handles chat send events, including spam detection and command processing.
 */
class ChatSendSubscription {
    private callback: ((event: ChatSendBeforeEvent) => void) | null;
    private spamData: Map<string, SpamTracker>;
    private channelMemberCache: Map<string, ChannelCacheEntry>;

    constructor() {
        this.callback = null;
        this.spamData = new Map();
        this.channelMemberCache = new Map();
    }

    /**
     * Registers subscription handling within event coordinator.
     */
    subscribe(): void {
        if (this.callback) return;

        this.callback = async (event: ChatSendBeforeEvent) => {
            const player = event.sender;
            const prefix = (world.getDynamicProperty("__prefix") as string) || ":";

            event.cancel = true;

            if (event.message.startsWith(prefix)) {
                commandHandler.handleCommand(event, player, prefix);
                return;
            }

            if (player.getDynamicProperty("isMuted") as boolean) {
                player.sendMessage("§o§c[Paradox] You are currently muted and cannot send messages.");
                return;
            }

            if (await handleSpamValidation(player, this.spamData)) {
                return;
            }

            const playerChannel = await getPlayerChannel(player);
            const formattedMessage = formatChatMessage(player, playerChannel, event.message);

            if (playerChannel) {
                await handleChannelBroadcast(playerChannel, formattedMessage, this.channelMemberCache);
            } else {
                broadcastGlobalMessage(formattedMessage);
            }
        };

        EventCoordinator.subscribeBefore("chatSend", this.callback);
    }

    /**
     * Deregisters chat send handling callback.
     */
    unsubscribe(): void {
        if (!this.callback) return;

        EventCoordinator.unsubscribeBefore("chatSend", this.callback);
        this.callback = null;
    }
}

export const chatSendSubscription = new ChatSendSubscription();
