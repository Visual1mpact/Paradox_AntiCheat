import { world, Player, PlayerLeaveBeforeEvent, PlayerSpawnAfterEvent, system } from "@minecraft/server";

/**
 * Centralized cache of online players.
 * Eliminates repeated calls to `world.getPlayers()` across scripts.
 * Provides high-performance iteration, filtered access, and auto-cleanup of ghost players.
 */
export class PlayerCache {
    /** Map of player ID -> Player object */
    private static playersById = new Map<string, Player>();
    /** Map of player name -> Player object for O(1) name lookups */
    private static playersByName = new Map<string, Player>();

    /** Prevents double initialization */
    private static initialized = false;

    /** Event subscriptions */
    private static spawnSubscription?: (ev: PlayerSpawnAfterEvent) => void;
    private static leaveSubscription?: (ev: PlayerLeaveBeforeEvent) => void;

    /** Periodic cleanup interval ID */
    private static cleanupInterval?: number;

    /** Interval in ticks to reconcile ghost players */
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
            this.playersById.set(player.id, player);
            this.playersByName.set(player.name, player);
        }

        // Subscribe to player join
        this.spawnSubscription = (ev: PlayerSpawnAfterEvent) => {
            const p = ev.player;

            if (!this.playersById.has(p.id)) {
                this.playersById.set(p.id, p);
                this.playersByName.set(p.name, p);
            }
        };
        world.afterEvents.playerSpawn.subscribe(this.spawnSubscription);

        // Subscribe to player leave
        this.leaveSubscription = (ev: PlayerLeaveBeforeEvent) => {
            const player = this.playersById.get(ev.player.id);
            if (!player) return;

            this.playersByName.delete(player.name);
            this.playersById.delete(ev.player.id);
        };
        world.beforeEvents.playerLeave.subscribe(this.leaveSubscription);

        // Start periodic cleanup of ghost players
        this.cleanupInterval = system.runInterval(() => this.reconcileCache(), this.CLEANUP_INTERVAL_TICKS);
    }

    /**
     * Removes any cached players that are no longer online.
     * Ensures the cache doesn't retain "ghost" players if leave events fail.
     */
    private static reconcileCache() {
        const onlineIds = new Set<string>();
        for (const [id, player] of this.playersById) {
            if (!onlineIds.has(id)) {
                this.playersById.delete(id);
                this.playersByName.delete(player.name);
                continue;
            }

            // Ensure name cache stays accurate
            const cached = this.playersByName.get(player.name);
            if (cached !== player) {
                // Remove any old entry pointing to this player
                for (const [name, p] of this.playersByName) {
                    if (p === player) {
                        this.playersByName.delete(name);
                        break;
                    }
                }
                this.playersByName.set(player.name, player);
            }
        }
    }

    /** Returns an iterator of all currently cached player names */
    public static *getPlayerNames(): IterableIterator<string> {
        yield* this.playersByName.keys();
    }

    /** Returns a cached player by their unique ID */
    public static getPlayerById(id: string): Player | undefined {
        return this.playersById.get(id);
    }

    /** Returns a cached player by their exact username */
    public static getPlayerByName(name: string): Player | undefined {
        return this.playersByName.get(name);
    }

    /** Iterator over all cached players */
    public static getPlayers(): IterableIterator<Player> {
        return this.playersById.values();
    }

    /** Iterator over [ID, Player] entries */
    public static entries(): IterableIterator<[string, Player]> {
        return this.playersById.entries();
    }

    /** Iterator over players whose IDs exist in the provided Set */
    public static *filterByIds(ids: Set<string>): IterableIterator<Player> {
        for (const id of ids) {
            const player = this.playersById.get(id);
            if (player) yield player;
        }
    }

    /** Number of currently cached players */
    public static size(): number {
        return this.playersById.size;
    }

    /** Clears the cache, unsubscribes from events, and stops auto-cleanup */
    public static destroy() {
        this.playersById.clear();
        this.playersByName.clear();

        if (this.spawnSubscription) {
            world.afterEvents.playerSpawn.unsubscribe(this.spawnSubscription);
            this.spawnSubscription = undefined;
        }
        if (this.leaveSubscription) {
            world.beforeEvents.playerLeave.unsubscribe(this.leaveSubscription);
            this.leaveSubscription = undefined;
        }

        if (this.cleanupInterval !== undefined) {
            system.clearRun(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }

        this.initialized = false;
    }
}
