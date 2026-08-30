import { world, Player, PlayerLeaveBeforeEvent, PlayerSpawnAfterEvent, system } from "@minecraft/server";
import { EventCoordinator } from "../core/event-coordinator";

/**
 * Centralized cache of online players.
 * Eliminates repeated calls to `world.getPlayers()` across scripts.
 * Provides O(1) lookups, array snapshots, and lazy iterable access.
 */
export class PlayerCache {
    /** Map of player ID -> Player object */
    private static playersById = new Map<string, Player>();
    /** Map of player name -> Player object for O(1) name lookups */
    private static playersByName = new Map<string, Player>();
    /** Tracking map of player ID -> player name to safely prune names when Player reference becomes invalid */
    private static nameByPlayerId = new Map<string, string>();

    /** Internal array buffer for O(1) reads without GC allocations */
    private static cachedPlayerArray: Player[] = [];
    /** Cached array of active player names */
    private static cachedNameArray: string[] = [];
    private static arrayDirty = true;

    /** Prevents double initialization */
    private static initialized = false;

    /** Event subscriptions */
    private static spawnSubscription?: (ev: PlayerSpawnAfterEvent) => void;
    private static leaveSubscription?: (ev: PlayerLeaveBeforeEvent) => void;

    /** Periodic cleanup interval ID */
    private static cleanupInterval?: number;

    /** Interval in ticks to reconcile ghost players and refresh references */
    private static readonly CLEANUP_INTERVAL_TICKS = 1200; // 1 minute at 20 ticks/second

    /**
     * Initializes the player cache.
     * Subscribes to player join/leave events and populates initial cache.
     */
    public static init(): void {
        if (this.initialized) return;
        this.initialized = true;

        const initialPlayers = world.getPlayers();
        for (let i = 0; i < initialPlayers.length; i++) {
            const player = initialPlayers[i]!;
            if (player?.isValid) {
                this.cachePlayer(player);
            }
        }

        this.spawnSubscription = (ev: PlayerSpawnAfterEvent) => {
            const p = ev.player;
            if (p?.isValid) {
                this.cachePlayer(p);
            }
        };
        EventCoordinator.subscribeAfter("playerSpawn", this.spawnSubscription);

        this.leaveSubscription = (ev: PlayerLeaveBeforeEvent) => {
            try {
                const playerId = ev.player?.id;
                if (playerId) {
                    this.uncachePlayer(playerId);
                }
            } catch {
                this.reconcileCache();
            }
        };
        EventCoordinator.subscribeBefore("playerLeave", this.leaveSubscription);

        this.cleanupInterval = system.runInterval(() => this.reconcileCache(), this.CLEANUP_INTERVAL_TICKS);
    }

    /** Helper to register/update player in maps safely */
    private static cachePlayer(player: Player): void {
        try {
            const id = player.id;
            const name = player.name;

            const existingName = this.nameByPlayerId.get(id);
            if (existingName && existingName !== name) {
                this.playersByName.delete(existingName);
            }

            this.playersById.set(id, player);
            this.playersByName.set(name, player);
            this.nameByPlayerId.set(id, name);
            this.arrayDirty = true;
        } catch {
            // Guard against edge cases where isValid was true but state changed mid-tick
        }
    }

    /** Helper to remove player by ID without accessing player properties */
    private static uncachePlayer(id: string): void {
        const cachedName = this.nameByPlayerId.get(id);
        if (cachedName) {
            this.playersByName.delete(cachedName);
            this.nameByPlayerId.delete(id);
        }
        this.playersById.delete(id);
        this.arrayDirty = true;
    }

    /** Removes disconnected players and refreshes references with fresh instances */
    private static reconcileCache(): void {
        const onlinePlayers = world.getPlayers();
        const activeIds = new Set<string>();

        for (let i = 0; i < onlinePlayers.length; i++) {
            const player = onlinePlayers[i]!;
            if (player?.isValid) {
                try {
                    activeIds.add(player.id);
                    this.cachePlayer(player);
                } catch {
                    // Ignore transient invalid references
                }
            }
        }

        const keys = Array.from(this.playersById.keys());
        for (let i = 0; i < keys.length; i++) {
            const id = keys[i]!;
            if (!activeIds.has(id)) {
                this.uncachePlayer(id);
            }
        }
        this.arrayDirty = true;
    }

    /** Rebuilds array buffers without creating new heap allocations */
    private static updateBuffer(): void {
        if (!this.arrayDirty) return;

        this.cachedPlayerArray.length = 0;
        this.cachedNameArray.length = 0;

        for (const player of this.playersById.values()) {
            try {
                if (player.isValid) {
                    this.cachedPlayerArray.push(player);
                    this.cachedNameArray.push(player.name);
                }
            } catch {
                // Skip destroyed handles
            }
        }
        this.arrayDirty = false;
    }

    /**
     * Returns the internal cached player array directly in O(1) time.
     * WARNING: Do not mutate this array directly as it will affect internal cache references.
     * @returns {readonly Player[]} Direct array reference buffer
     */
    public static getAllPlayers(): readonly Player[] {
        this.updateBuffer();
        return this.cachedPlayerArray;
    }

    /**
     * Returns the internal cached player array directly in O(1) time.
     * Alias for `getAllPlayers()`.
     * @returns {readonly Player[]} Direct array reference buffer
     */
    public static getPlayersArray(): readonly Player[] {
        return this.getAllPlayers();
    }

    /**
     * Returns a new mutable Array copy of online players.
     * Allows callers to safely push, pop, or sort array elements without mutating cache state.
     * @returns {Player[]} Writable Player array copy
     */
    public static getPlayersArrayCopy(): Player[] {
        this.updateBuffer();
        const copy = new Array<Player>(this.cachedPlayerArray.length);
        for (let i = 0; i < this.cachedPlayerArray.length; i++) {
            copy[i] = this.cachedPlayerArray[i]!;
        }
        return copy;
    }

    /**
     * Returns an array of cached player names in O(1) time.
     * @returns {string[]} Array of player names
     */
    public static getPlayerNamesArray(): string[] {
        this.updateBuffer();
        return this.cachedNameArray;
    }

    /**
     * Returns a cached player by their unique ID if valid in O(1) time.
     * @param {string} id - Player ID
     * @returns {Player | undefined} Player object or undefined
     */
    public static getPlayerById(id: string): Player | undefined {
        const player = this.playersById.get(id);
        if (!player) return undefined;
        try {
            if (player.isValid) return player;
        } catch {
            this.uncachePlayer(id);
        }
        return undefined;
    }

    /**
     * Returns a cached player by their exact username if valid in O(1) time.
     * @param {string} name - Exact player name
     * @returns {Player | undefined} Player object or undefined
     */
    public static getPlayerByName(name: string): Player | undefined {
        const player = this.playersByName.get(name);
        if (!player) return undefined;
        try {
            if (player.isValid) return player;
        } catch {
            const id = player.id;
            if (id) this.uncachePlayer(id);
        }
        return undefined;
    }

    // --- ITERATORS & GENERATORS ---

    /** Lazy iterable iterator over all valid cached players */
    public static *getPlayers(): IterableIterator<Player> {
        this.updateBuffer();
        for (let i = 0; i < this.cachedPlayerArray.length; i++) {
            yield this.cachedPlayerArray[i]!;
        }
    }

    /** Lazy iterable iterator of all valid cached player names */
    public static *getPlayerNames(): IterableIterator<string> {
        this.updateBuffer();
        for (let i = 0; i < this.cachedNameArray.length; i++) {
            yield this.cachedNameArray[i]!;
        }
    }

    /** Lazy iterable iterator over [ID, Player] entries for valid players */
    public static *entries(): IterableIterator<[string, Player]> {
        this.updateBuffer();
        for (let i = 0; i < this.cachedPlayerArray.length; i++) {
            const player = this.cachedPlayerArray[i]!;
            yield [player.id, player];
        }
    }

    /** Lazy iterable iterator over players matching the provided set of IDs */
    public static *filterByIds(ids: Set<string>): IterableIterator<Player> {
        for (const id of ids) {
            const player = this.getPlayerById(id);
            if (player) {
                yield player;
            }
        }
    }

    /** Returns the total count of online cached players in O(1) time */
    public static size(): number {
        this.updateBuffer();
        return this.cachedPlayerArray.length;
    }

    /** Clears the cache, unsubscribes from events, and stops auto-cleanup */
    public static destroy(): void {
        this.playersById.clear();
        this.playersByName.clear();
        this.nameByPlayerId.clear();
        this.cachedPlayerArray.length = 0;
        this.cachedNameArray.length = 0;
        this.arrayDirty = true;

        if (this.spawnSubscription) {
            EventCoordinator.unsubscribeAfter("playerSpawn", this.spawnSubscription);
            delete this.spawnSubscription;
        }
        if (this.leaveSubscription) {
            EventCoordinator.unsubscribeBefore("playerLeave", this.leaveSubscription);
            delete this.leaveSubscription;
        }

        if (this.cleanupInterval !== undefined) {
            system.clearRun(this.cleanupInterval);
            delete this.cleanupInterval;
        }

        this.initialized = false;
    }
}
