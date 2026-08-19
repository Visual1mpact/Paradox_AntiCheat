import { world, Player, PlayerLeaveBeforeEvent, PlayerSpawnAfterEvent, system } from "@minecraft/server";
import { EventCoordinator } from "../event-coordinator";

/**
 * Centralized cache of online players.
 * Eliminates repeated calls to `world.getPlayers()` across scripts.
 * Provides high-performance iteration, filtered access, and auto-cleanup of ghost/invalid players.
 */
export class PlayerCache {
    /** Map of player ID -> Player object */
    private static playersById = new Map<string, Player>();
    /** Map of player name -> Player object for O(1) name lookups */
    private static playersByName = new Map<string, Player>();
    /** Tracking map of player ID -> player name to safely prune names when Player reference becomes invalid */
    private static nameByPlayerId = new Map<string, string>();

    /** Cached array representation of active players to avoid generator allocation overhead during frequent loops */
    private static cachedPlayerArray: Player[] = [];
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
     * Safe to call multiple times; will only initialize once.
     */
    public static init() {
        if (this.initialized) return;
        this.initialized = true;

        // Populate initial cache
        for (const player of world.getPlayers()) {
            if (player?.isValid) {
                this.cachePlayer(player);
            }
        }

        // Subscribe to player spawn (handles both initial join and respawns/dimension changes)
        this.spawnSubscription = (ev: PlayerSpawnAfterEvent) => {
            const p = ev.player;
            if (p?.isValid) {
                this.cachePlayer(p);
            }
        };
        EventCoordinator.subscribeAfter("playerSpawn", this.spawnSubscription);

        // Subscribe to player leave
        this.leaveSubscription = (ev: PlayerLeaveBeforeEvent) => {
            // Safely attempt to extract player ID
            try {
                const playerId = ev.player?.id;
                if (playerId) {
                    this.uncachePlayer(playerId);
                }
            } catch {
                // If native object is already destroyed, fallback to reconcile cleanup
                this.reconcileCache();
            }
        };
        EventCoordinator.subscribeBefore("playerLeave", this.leaveSubscription);

        // Start periodic cleanup and reference update
        this.cleanupInterval = system.runInterval(() => this.reconcileCache(), this.CLEANUP_INTERVAL_TICKS);
    }

    /** Helper to register/update player in maps safely */
    private static cachePlayer(player: Player) {
        try {
            const id = player.id;
            const name = player.name;

            // Invalidate old name mapping if name changed mid-session
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
    private static uncachePlayer(id: string) {
        const cachedName = this.nameByPlayerId.get(id);
        if (cachedName) {
            this.playersByName.delete(cachedName);
            this.nameByPlayerId.delete(id);
        }
        this.playersById.delete(id);
        this.arrayDirty = true;
    }

    /**
     * Removes disconnected players and refreshes references with fresh instances from world.getPlayers().
     */
    private static reconcileCache() {
        const onlinePlayers = world.getPlayers();
        const activeIds = new Set<string>();

        // Re-populate with fresh, valid player objects
        for (const player of onlinePlayers) {
            if (player?.isValid) {
                try {
                    activeIds.add(player.id);
                    this.cachePlayer(player);
                } catch {
                    // Ignore transient invalid references
                }
            }
        }

        // Prune cache entries no longer online or loaded without extra array allocations
        for (const id of this.playersById.keys()) {
            if (!activeIds.has(id)) {
                this.uncachePlayer(id);
            }
        }
        this.arrayDirty = true;
    }

    /**
     * Returns an array snapshot of all currently active players.
     * Reuses an internal array buffer to eliminate GC allocations during tick loops.
     */
    public static getAllPlayers(): readonly Player[] {
        if (this.arrayDirty) {
            this.cachedPlayerArray = [];
            for (const player of this.playersById.values()) {
                try {
                    if (player.isValid) {
                        this.cachedPlayerArray.push(player);
                    }
                } catch {
                    // Skip destroyed handles
                }
            }
            this.arrayDirty = false;
        }
        return this.cachedPlayerArray;
    }

    /**
     * Returns the internal cached player array directly.
     * Eliminates the need for Array.from() or spread operators when direct array access/indexing is required.
     */
    public static getPlayersArray(): readonly Player[] {
        return this.getAllPlayers();
    }

    /** Returns an iterator of all valid cached player names */
    public static *getPlayerNames(): IterableIterator<string> {
        for (const name of this.playersByName.keys()) {
            yield name;
        }
    }

    /** Returns a cached player by their unique ID if valid */
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

    /** Returns a cached player by their exact username if valid */
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

    /** Iterator over all currently valid cached players */
    public static *getPlayers(): IterableIterator<Player> {
        const players = this.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            yield players[i];
        }
    }

    /** Iterator over [ID, Player] entries for valid players */
    public static *entries(): IterableIterator<[string, Player]> {
        const players = this.getAllPlayers();
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            yield [player.id, player];
        }
    }

    /** Iterator over players whose IDs exist in the provided Set and are valid */
    public static *filterByIds(ids: Set<string>): IterableIterator<Player> {
        for (const id of ids) {
            const player = this.getPlayerById(id);
            if (player) {
                yield player;
            }
        }
    }

    /** Number of currently valid cached players */
    public static size(): number {
        return this.getAllPlayers().length;
    }

    /** Clears the cache, unsubscribes from events, and stops auto-cleanup */
    public static destroy() {
        this.playersById.clear();
        this.playersByName.clear();
        this.nameByPlayerId.clear();
        this.cachedPlayerArray = [];
        this.arrayDirty = true;

        if (this.spawnSubscription) {
            EventCoordinator.unsubscribeAfter("playerSpawn", this.spawnSubscription);
            this.spawnSubscription = undefined;
        }
        if (this.leaveSubscription) {
            EventCoordinator.unsubscribeBefore("playerLeave", this.leaveSubscription);
            this.leaveSubscription = undefined;
        }

        if (this.cleanupInterval !== undefined) {
            system.clearRun(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }

        this.initialized = false;
    }
}
