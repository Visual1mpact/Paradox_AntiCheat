import { world, Player, PlayerLeaveBeforeEvent, PlayerSpawnAfterEvent } from "@minecraft/server";

/**
 * Centralized cache of online players.
 * Eliminates repeated calls to `world.getPlayers()` across scripts.
 * Provides high-performance iteration and filtered access.
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
            if (!ev.initialSpawn) return;
            this.playersById.set(ev.player.id, ev.player);
            this.playersByName.set(ev.player.name, ev.player);
        };
        world.afterEvents.playerSpawn.subscribe(this.spawnSubscription);

        // Subscribe to player leave
        this.leaveSubscription = (ev: PlayerLeaveBeforeEvent) => {
            const player = this.playersById.get(ev.player.id);
            if (player) this.playersByName.delete(player.name);
            this.playersById.delete(ev.player.id);
        };
        world.beforeEvents.playerLeave.subscribe(this.leaveSubscription);
    }

    /** Returns an array of all currently cached player names */
    public static getPlayerNames(): string[] {
        return Array.from(this.playersByName.keys());
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
        for (const [id, player] of this.playersById.entries()) {
            if (ids.has(id)) yield player;
        }
    }

    /** Number of currently cached players */
    public static size(): number {
        return this.playersById.size;
    }

    /** Clears the cache and unsubscribes from all events */
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

        this.initialized = false;
    }
}
