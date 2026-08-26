import { Vector3, Vector2, Dimension, PlayerLeaveBeforeEvent, system, Player } from "@minecraft/server";
import { EventCoordinator } from "../core/event-coordinator";
import { PlayerCache } from "./player-cache";

/**
 * Represents the cached physical state (position, dimension, and camera rotation)
 * of a player during a given tick.
 */
export interface CachedPlayerTransform {
    /** The player's exact X, Y, Z block or sub-block coordinates */
    location: Vector3;
    /** The dimension instance where the player currently resides */
    dimension: Dimension;
    /** Pitch and yaw rotation angles of the player */
    rotation: Vector2;
    /** The server tick count when this transform state was last evaluated */
    lastUpdatedTick: number;
}

/**
 * High-performance location caching utility for online players.
 * Eliminates redundant native C++ bridge cross-calls by batching location,
 * dimension, and rotation reads once per player per tick.
 */
export class PlayerLocationCache {
    /** In-memory storage mapping player IDs to their cached transform state */
    private static transformCache = new Map<string, CachedPlayerTransform>();
    /** Flag tracking whether event subscriptions have been registered */
    private static initialized = false;
    /** Subscription reference for player departure event cleanup */
    private static leaveSubscription: ((ev: PlayerLeaveBeforeEvent) => void) | undefined;

    /**
     * Initializes the player location cache and sets up event listeners.
     * Safe to call multiple times; will only execute once.
     */
    public static init() {
        if (this.initialized) return;
        this.initialized = true;

        // Clean up cached location state when players disconnect
        this.leaveSubscription = (ev: PlayerLeaveBeforeEvent) => {
            try {
                const playerId = ev.player?.id;
                if (playerId) {
                    this.transformCache.delete(playerId);
                }
            } catch {
                // Ignore destruction errors
            }
        };
        EventCoordinator.subscribeBefore("playerLeave", this.leaveSubscription);
    }

    /**
     * Optimized: Bypasses redundant player.isValid cross-bridge check.
     * Relying on try-catch handles native handle invalidation mid-tick with zero performance overhead.
     *
     * @param player - The Minecraft Player entity to query.
     * @returns The cached or newly calculated player transform, or undefined if invalid.
     */
    public static getTransform(player: Player): CachedPlayerTransform | undefined {
        if (!player) return undefined;

        try {
            const playerId = player.id;
            const currentTick = system.currentTick;
            let cached = this.transformCache.get(playerId);

            if (!cached || cached.lastUpdatedTick !== currentTick) {
                // Fetch direct native properties in one batch
                const loc = player.location;
                const dim = player.dimension;
                const rot = player.getRotation();

                cached = {
                    location: { x: loc.x, y: loc.y, z: loc.z },
                    dimension: dim,
                    rotation: { x: rot.x, y: rot.y },
                    lastUpdatedTick: currentTick,
                };
                this.transformCache.set(playerId, cached);
            }

            return cached;
        } catch {
            // If player handle was destroyed during tick, cleanup cache without isValid call
            return undefined;
        }
    }

    /**
     * Forces an immediate update of the player's transform cache, bypassing same-tick throttling.
     * Call this immediately after teleporting or modifying a player's position.
     *
     * @param player - The player whose cached transform should be updated.
     * @returns The freshly fetched transform data, or undefined if the player is invalid.
     */
    public static refresh(player: Player): CachedPlayerTransform | undefined {
        if (!player) return undefined;

        try {
            const loc = player.location;
            const dim = player.dimension;
            const rot = player.getRotation();

            const updated: CachedPlayerTransform = {
                location: { x: loc.x, y: loc.y, z: loc.z },
                dimension: dim,
                rotation: { x: rot.x, y: rot.y },
                lastUpdatedTick: system.currentTick,
            };

            this.transformCache.set(player.id, updated);
            return updated;
        } catch {
            return undefined;
        }
    }

    /**
     * Removes a player's transform entry from the cache, forcing the next `getTransform` call
     * to fetch fresh data from the native engine.
     *
     * @param playerIdOrPlayer - The string ID or Player object to invalidate.
     */
    public static invalidate(playerIdOrPlayer: string | Player): void {
        if (typeof playerIdOrPlayer === "string") {
            this.transformCache.delete(playerIdOrPlayer);
        } else if (playerIdOrPlayer) {
            try {
                this.transformCache.delete(playerIdOrPlayer.id);
            } catch {
                // Ignore handle errors
            }
        }
    }

    /**
     * Convenience method to fetch a player's cached position vector using only their ID.
     *
     * @param id - The unique player ID string.
     * @returns The Vector3 position if available and valid, otherwise undefined.
     */
    public static getLocationById(id: string): Vector3 | undefined {
        const player = PlayerCache.getPlayerById(id);
        if (!player) {
            this.transformCache.delete(id);
            return undefined;
        }
        return this.getTransform(player)?.location;
    }

    /**
     * Batch updates the location transforms for all online players for the current tick
     * and purges orphaned cache records for disconnected players.
     */
    public static updateAll() {
        const currentTick = system.currentTick;
        const validPlayerIds = new Set<string>();

        // PlayerCache.getPlayers() already handles validity checks
        for (const player of PlayerCache.getPlayers()) {
            try {
                const id = player.id;
                validPlayerIds.add(id);

                const loc = player.location;
                const rot = player.getRotation();

                this.transformCache.set(id, {
                    location: { x: loc.x, y: loc.y, z: loc.z },
                    dimension: player.dimension,
                    rotation: { x: rot.x, y: rot.y },
                    lastUpdatedTick: currentTick,
                });
            } catch {
                // Handle invalid entities silently
            }
        }

        // Purge orphaned entries
        for (const playerId of this.transformCache.keys()) {
            if (!validPlayerIds.has(playerId)) {
                this.transformCache.delete(playerId);
            }
        }
    }

    /**
     * Completely resets the cache state, clears subscriptions, and restores uninitialized state.
     */
    public static destroy() {
        this.transformCache.clear();
        if (this.leaveSubscription) {
            EventCoordinator.unsubscribeBefore("playerLeave", this.leaveSubscription);
            this.leaveSubscription = undefined;
        }
        this.initialized = false;
    }
}
