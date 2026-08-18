import { Vector3, Vector2, Dimension, PlayerLeaveBeforeEvent, system, Player } from "@minecraft/server";
import { EventCoordinator } from "../event-coordinator";
import { PlayerCache } from "./player-cache";

export interface CachedPlayerTransform {
    /** Cached X, Y, Z coordinates */
    location: Vector3;
    /** Cached Dimension instance */
    dimension: Dimension;
    /** Cached head/body rotation */
    rotation: Vector2;
    /** Cached tick number when this transform was queried */
    lastUpdatedTick: number;
}

/**
 * Centralized, per-tick cached location tracking for online players.
 * Eliminates repeated cross-bridge C++ calls for `player.location`, `player.dimension`, and `player.getRotation()`.
 */
export class PlayerLocationCache {
    /** Map of Player ID -> Cached Transform data */
    private static transformCache = new Map<string, CachedPlayerTransform>();

    private static initialized = false;
    private static leaveSubscription?: (ev: PlayerLeaveBeforeEvent) => void;

    /**
     * Initializes the location cache listeners.
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
                // If native object is destroyed, clear missing entries during getter cycles
            }
        };
        EventCoordinator.subscribeBefore("playerLeave", this.leaveSubscription);
    }

    /**
     * Retrieves the cached transform for a player, updating it if the cache is stale (older than current tick).
     */
    public static getTransform(player: Player): CachedPlayerTransform | undefined {
        if (!player || !player.isValid) {
            if (player?.id) {
                this.transformCache.delete(player.id);
            }
            return undefined;
        }

        const currentTick = system.currentTick;
        let cached = this.transformCache.get(player.id);

        if (!cached || cached.lastUpdatedTick !== currentTick) {
            cached = this.refresh(player);
        }

        return cached;
    }

    /**
     * Forces an immediate update of the player's transform cache.
     * Call this after teleporting or modifying a player's transform within the same tick.
     */
    public static refresh(player: Player): CachedPlayerTransform | undefined {
        if (!player || !player.isValid) {
            if (player?.id) {
                this.transformCache.delete(player.id);
            }
            return undefined;
        }

        try {
            // C++ bridge calls happen ONLY ONCE per player per tick or on forced refresh
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
            // Player entity lost native reference mid-tick
            this.transformCache.delete(player.id);
            return undefined;
        }
    }

    /**
     * Explicitly invalidates a player's cached transform, forcing the next lookup to fetch fresh data.
     * Use when teleporting a player or after applying rubberband knockback.
     */
    public static invalidate(playerIdOrPlayer: string | Player): void {
        const id = typeof playerIdOrPlayer === "string" ? playerIdOrPlayer : playerIdOrPlayer?.id;
        if (id) {
            this.transformCache.delete(id);
        }
    }

    /**
     * Helper to retrieve only location for a given player ID (integrates with PlayerCache).
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
     * Optional pre-fetch step to batch update all active players at the start of a tick.
     * Also prunes entries for players who are no longer valid/connected.
     */
    public static updateAll() {
        const currentTick = system.currentTick;
        const validPlayerIds = new Set<string>();

        for (const player of PlayerCache.getPlayers()) {
            if (!player || !player.isValid) continue;

            try {
                validPlayerIds.add(player.id);
                this.transformCache.set(player.id, {
                    location: { x: player.location.x, y: player.location.y, z: player.location.z },
                    dimension: player.dimension,
                    rotation: { x: player.getRotation().x, y: player.getRotation().y },
                    lastUpdatedTick: currentTick,
                });
            } catch {
                this.transformCache.delete(player.id);
            }
        }

        // Purge orphaned entries for players who left without triggering events cleanly
        for (const playerId of this.transformCache.keys()) {
            if (!validPlayerIds.has(playerId)) {
                this.transformCache.delete(playerId);
            }
        }
    }

    /** Cleans up resources */
    public static destroy() {
        this.transformCache.clear();
        if (this.leaveSubscription) {
            EventCoordinator.unsubscribeBefore("playerLeave", this.leaveSubscription);
            this.leaveSubscription = undefined;
        }
        this.initialized = false;
    }
}
