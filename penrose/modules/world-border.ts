/**
 * @file modules/world-border.ts
 * @description High-performance, anti-cheat resistant world border enforcement system.
 */

import { Player, world, system, Dimension, PlayerLeaveBeforeEvent, PlayerSpawnAfterEvent, Vector3 } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { PlayerCache } from "../classes/cache/player-cache";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";
import { EventCoordinator } from "../classes/core/event-coordinator";

/** Structure defining per-dimension border distance limits */
interface BorderBounds {
    /** Overworld max distance from center in blocks */
    overworld: number;
    /** Nether max distance from center in blocks */
    nether: number;
    /** End max distance from center in blocks */
    end: number;
}

/** Represents configuration parameters loaded from database */
interface ModuleConfig {
    /** Global module enablement flag */
    enabled?: boolean;
    /** Per-dimension bounds settings */
    settings?: BorderBounds;
}

/** In-flight safe position search payload */
interface PendingSafeYCheck {
    /** Target player instance */
    player: Player;
    /** Player dimension handle */
    dimension: Dimension;
    /** Target clamped X coordinate */
    targetX: number;
    /** Target clamped Z coordinate */
    targetZ: number;
    /** Friendly dimension display name */
    dimensionName: string;
    /** True if player exceeded the outer safety perimeter */
    beyondBorder: boolean;
}

/** Execution tracking state flags */
let isModuleActive = false;
let isSafeYJobActive = false;

/** Cached border configuration data */
let moduleConfig: ModuleConfig | undefined;
let checkIntervalId: number | undefined;
let configRefreshIntervalId: number | undefined;

/** Fast in-memory caches */
const securityClearanceCache = new Map<string, number>();
const lastBorderNudgeCache = new Map<string, number>();
const playerNextCheckTickCache = new Map<string, number>();

/** Cached spawn location for Overworld centering */
const cachedSpawnLocation: Vector3 = { x: 0, y: 0, z: 0 };
let cachedBounds: BorderBounds = { overworld: 0, nether: 0, end: 0 };

/** Timing & Distance Constants */
const CHECK_INTERVAL_TICKS = 10;
const CONFIG_REFRESH_INTERVAL_TICKS = 1200;
const ADMIN_BYPASS_SLEEP_TICKS = 600;
const DEBOUNCE_TICKS = 10;
const BUFFER = 2;
const MAX_SAFE_Y_SEARCH_DISTANCE = 32;

/** High-performance processing queue */
const safeYQueue: PendingSafeYCheck[] = [];
const queuedPlayerIds = new Set<string>();

/** Listener unsubscribe handlers */
let leaveSubscription: ((ev: PlayerLeaveBeforeEvent) => void) | undefined;
let spawnSubscription: ((ev: PlayerSpawnAfterEvent) => void) | undefined;

/** Zero-allocation reusable object structures */
const blockQueryLoc: Vector3 = { x: 0, y: 0, z: 0 };
const teleportLoc: Vector3 = { x: 0, y: 0, z: 0 };

/**
 * Resolves the configured border size for a specified dimension ID.
 *
 * @param dimensionId - Native dimension identifier (e.g. "minecraft:overworld")
 * @returns Max block radius from center
 */
function getConfiguredBorder(dimensionId: string): number {
    switch (dimensionId) {
        case "minecraft:overworld":
            return cachedBounds.overworld;
        case "minecraft:nether":
            return cachedBounds.nether;
        case "minecraft:the_end":
            return cachedBounds.end;
        default:
            return 0;
    }
}

/**
 * Calculates dimension center coordinates.
 * Overworld uses default spawn point; Nether and End use world origin (0, 0).
 *
 * @param dimensionId - Native dimension identifier
 * @returns Vector2 representation of center coordinates
 */
function getDimensionCenter(dimensionId: string): { x: number; z: number } {
    if (dimensionId === "minecraft:overworld") {
        return { x: cachedSpawnLocation.x, z: cachedSpawnLocation.z };
    }
    return { x: 0, z: 0 };
}

/**
 * Retrieves the security clearance level for a player directly from dynamic properties.
 * Always checks live entity state to catch dynamic property mutations instantly.
 */
export function getSecurityClearance(player: Player): number {
    try {
        const rawProperty = player.getDynamicProperty("securityClearance");
        const clearance = typeof rawProperty === "number" ? rawProperty : 1;
        securityClearanceCache.set(player.id, clearance);
        return clearance;
    } catch {
        return securityClearanceCache.get(player.id) ?? 1;
    }
}

/**
 * Updates a player's security clearance level and updates internal cache.
 *
 * @param player - Target player entity
 * @param clearance - Clearance level to set
 */
export function setSecurityClearance(player: Player, clearance: number): void {
    try {
        player.setDynamicProperty("securityClearance", clearance);
    } catch {
        // Ignored if player instance is destroyed
    }

    securityClearanceCache.set(player.id, clearance);
    playerNextCheckTickCache.delete(player.id);

    if (clearance >= 4 && queuedPlayerIds.has(player.id)) {
        queuedPlayerIds.delete(player.id);
    }
}

/**
 * Purges cached entries associated with a player ID on disconnect.
 *
 * @param playerId - Unique string identifier of player
 */
export function clearPlayerBorderCache(playerId: string): void {
    securityClearanceCache.delete(playerId);
    lastBorderNudgeCache.delete(playerId);
    queuedPlayerIds.delete(playerId);
    playerNextCheckTickCache.delete(playerId);
}

/**
 * Evaluates player location against dimension border boundaries.
 *
 * @param player - Target player entity
 * @param currentTick - Pre-fetched current server tick
 */
function checkPlayerBorder(player: Player, currentTick: number): void {
    const clearance = getSecurityClearance(player);

    if (clearance >= 4) {
        if (queuedPlayerIds.has(player.id)) {
            queuedPlayerIds.delete(player.id);
        }
        playerNextCheckTickCache.set(player.id, currentTick + ADMIN_BYPASS_SLEEP_TICKS);
        return;
    } else {
        // IF player was previously sleeping due to level 4 admin bypass, clear it immediately
        const nextCheck = playerNextCheckTickCache.get(player.id) ?? 0;
        if (nextCheck > currentTick + CHECK_INTERVAL_TICKS) {
            playerNextCheckTickCache.delete(player.id);
        }
    }

    const nextCheck = playerNextCheckTickCache.get(player.id) ?? 0;
    if (currentTick < nextCheck || queuedPlayerIds.has(player.id)) return;

    try {
        const transform = PlayerLocationCache.getTransform(player);
        if (!transform) return;

        const { location: loc, dimension } = transform;
        const borderSize = getConfiguredBorder(dimension.id);
        if (borderSize <= 0) {
            playerNextCheckTickCache.set(player.id, currentTick + 100);
            return;
        }

        const center = getDimensionCenter(dimension.id);
        const minX = center.x - borderSize;
        const maxX = center.x + borderSize;
        const minZ = center.z - borderSize;
        const maxZ = center.z + borderSize;

        const distMinX = loc.x - minX;
        const distMaxX = maxX - loc.x;
        const distMinZ = loc.z - minZ;
        const distMaxZ = maxZ - loc.z;

        const minDistanceToEdge = Math.min(distMinX, distMaxX, distMinZ, distMaxZ);

        // Security fix: Max sleep capped tightly at 15 ticks to prevent high-velocity bypasses
        if (minDistanceToEdge > 60) {
            const sleepTicks = Math.min(15, Math.max(5, Math.floor((minDistanceToEdge - 30) / 10)));
            playerNextCheckTickCache.set(player.id, currentTick + sleepTicks);
            return;
        }

        const hardMinX = minX - 15;
        const hardMaxX = maxX + 15;
        const hardMinZ = minZ - 15;
        const hardMaxZ = maxZ + 15;

        const outside = loc.x < hardMinX || loc.x > hardMaxX || loc.z < hardMinZ || loc.z > hardMaxZ;

        let targetX = loc.x;
        let targetZ = loc.z;

        if (outside) {
            targetX = center.x;
            targetZ = center.z;
        } else {
            if (loc.x < minX) targetX = minX + BUFFER;
            else if (loc.x > maxX) targetX = maxX - BUFFER;

            if (loc.z < minZ) targetZ = minZ + BUFFER;
            else if (loc.z > maxZ) targetZ = maxZ - BUFFER;
        }

        if (targetX === loc.x && targetZ === loc.z) {
            playerNextCheckTickCache.set(player.id, currentTick + CHECK_INTERVAL_TICKS);
            return;
        }

        if (!outside) {
            const lastNudge = lastBorderNudgeCache.get(player.id) ?? 0;
            if (currentTick - lastNudge < DEBOUNCE_TICKS) return;
            lastBorderNudgeCache.set(player.id, currentTick);
        }

        queuedPlayerIds.add(player.id);
        safeYQueue.push({
            player,
            dimension,
            targetX,
            targetZ,
            dimensionName: dimension.id === "minecraft:overworld" ? "Overworld" : dimension.id === "minecraft:nether" ? "Nether" : "End",
            beyondBorder: outside,
        });
    } catch (e) {
        console.error(`[Paradox] Error evaluating player world border: ${e}`);
    }
}

/**
 * Validates block clearance at target coordinates.
 *
 * @param dimension - Target dimension
 * @param x - Block X coordinate
 * @param testY - Block Y coordinate
 * @param z - Block Z coordinate
 * @returns True if block column is safe for player placement
 */
function findSafeYAt(dimension: Dimension, x: number, testY: number, z: number): boolean {
    try {
        blockQueryLoc.x = x;
        blockQueryLoc.z = z;

        blockQueryLoc.y = testY - 1;
        const feet = dimension.getBlock(blockQueryLoc);
        if (!feet?.isSolid) return false;

        blockQueryLoc.y = testY;
        const body = dimension.getBlock(blockQueryLoc);
        if (body?.isSolid) return false;

        blockQueryLoc.y = testY + 1;
        const head = dimension.getBlock(blockQueryLoc);
        if (head?.isSolid) return false;

        return true;
    } catch {
        return false;
    }
}

/**
 * Job generator worker computing non-blocking safe vertical coordinates for teleportation.
 */
function* safeYWorker(): Generator<void, void, unknown> {
    if (isSafeYJobActive) return;
    isSafeYJobActive = true;

    try {
        while (isModuleActive && safeYQueue.length > 0) {
            // Memory Fix: Array shift ensures zero heap reference leaks
            const request = safeYQueue.shift();
            if (!request) continue;

            const { player, dimension, targetX, targetZ, dimensionName, beyondBorder } = request;

            if (player?.id) {
                const isStillQueued = queuedPlayerIds.has(player.id);
                queuedPlayerIds.delete(player.id);

                if (!isStillQueued || getSecurityClearance(player) === 4) {
                    continue;
                }
            }

            if (!player?.isValid) continue;

            // Fetch live current position rather than stale queued coordinates
            const currentTransform = PlayerLocationCache.getTransform(player);
            const currentY = currentTransform ? currentTransform.location.y : player.location.y;

            const minHeight = dimension.heightRange?.min ?? -64;
            const maxHeight = dimension.heightRange?.max ?? 320;
            const startY = Math.max(minHeight + 1, Math.min(Math.floor(currentY), maxHeight - 2));

            let safeY: number | undefined;
            let iterationsThisTick = 0;

            for (let offset = 0; offset <= MAX_SAFE_Y_SEARCH_DISTANCE; offset++) {
                if (offset === 0) {
                    if (findSafeYAt(dimension, targetX, startY, targetZ)) {
                        safeY = startY;
                        break;
                    }
                    iterationsThisTick++;
                } else {
                    const testYUp = startY + offset;
                    if (testYUp < maxHeight - 1 && findSafeYAt(dimension, targetX, testYUp, targetZ)) {
                        safeY = testYUp;
                        break;
                    }

                    const testYDown = startY - offset;
                    if (testYDown > minHeight && findSafeYAt(dimension, targetX, testYDown, targetZ)) {
                        safeY = testYDown;
                        break;
                    }

                    iterationsThisTick += 2;
                }

                if (iterationsThisTick >= 4) {
                    iterationsThisTick = 0;
                    yield;
                }
            }

            if (!player.isValid) continue;

            if (getSecurityClearance(player) === 4) {
                continue;
            }

            if (safeY === undefined) {
                try {
                    const effect = player.getEffect("minecraft:slow_falling");
                    if (!effect || effect.duration < 1200) {
                        player.addEffect("minecraft:slow_falling", 1200, { amplifier: 0 });
                    }
                } catch {
                    // Ignored if effect application fails
                }
                safeY = Math.max(minHeight + 1, Math.min(startY, maxHeight - 2));
            }

            try {
                if (beyondBorder) {
                    player.sendMessage(`§2[§7Paradox§2]§o§7 You exceeded the world border in the ${dimensionName} and were returned to spawn.`);
                } else {
                    player.sendMessage(`§2[§7Paradox§2]§o§7 You reached the world border in the ${dimensionName}.`);
                }

                teleportLoc.x = targetX;
                teleportLoc.y = safeY;
                teleportLoc.z = targetZ;

                player.teleport(teleportLoc, { dimension, checkForBlocks: true });
                PlayerLocationCache.refresh(player);
            } catch (e) {
                console.error(`[Paradox] Error applying world border teleport: ${e}`);
            }

            yield;
        }
    } finally {
        isSafeYJobActive = false;

        if (isModuleActive && safeYQueue.length > 0) {
            system.runJob(safeYWorker());
        }
    }
}

/**
 * Triggers the Safe-Y generator job queue if inactive.
 */
function startSafeYWorker(): void {
    if (!isModuleActive || isSafeYJobActive || safeYQueue.length === 0) return;
    system.runJob(safeYWorker());
}

/**
 * Main execution pass executed on tick interval.
 */
function runWorldBorderChecks(): void {
    if (!isModuleActive || !moduleConfig?.enabled || !moduleConfig.settings) return;

    const currentTick = system.currentTick;
    const players = PlayerCache.getPlayersArray();
    const len = players.length;

    for (let i = 0; i < len; i++) {
        checkPlayerBorder(players[i], currentTick);
    }

    startSafeYWorker();
}

/**
 * Safely fetches database configurations and updates world border boundaries.
 */
async function refreshConfig(): Promise<void> {
    try {
        moduleConfig = (await paradoxModulesDB.get("worldBorderCheck_b")) as ModuleConfig | undefined;

        if (moduleConfig?.settings) {
            cachedBounds.overworld = moduleConfig.settings.overworld ?? 0;
            cachedBounds.nether = moduleConfig.settings.nether ?? 0;
            cachedBounds.end = moduleConfig.settings.end ?? 0;
        }

        const spawn = world.getDefaultSpawnLocation();
        cachedSpawnLocation.x = spawn.x;
        cachedSpawnLocation.y = spawn.y;
        cachedSpawnLocation.z = spawn.z;
    } catch (e) {
        console.error(`[Paradox] Failed to load world border configuration: ${e}`);
    }
}

/**
 * Initializes and starts world border monitoring services.
 */
export async function startWorldBorderCheck(): Promise<void> {
    if (isModuleActive) return;

    isModuleActive = true;
    PlayerLocationCache.init();

    spawnSubscription = (ev: PlayerSpawnAfterEvent) => {
        if (ev.initialSpawn && ev.player) {
            system.runTimeout(() => {
                if (ev.player?.isValid) {
                    getSecurityClearance(ev.player);
                }
            }, 1);
        }
    };
    EventCoordinator.subscribeAfter("playerSpawn", spawnSubscription);

    leaveSubscription = (ev: PlayerLeaveBeforeEvent) => {
        if (ev.player?.id) {
            clearPlayerBorderCache(ev.player.id);
        }
    };
    EventCoordinator.subscribeBefore("playerLeave", leaveSubscription);

    await refreshConfig();

    if (!isModuleActive) return;

    checkIntervalId = system.runInterval(runWorldBorderChecks, CHECK_INTERVAL_TICKS);
    configRefreshIntervalId = system.runInterval(() => {
        refreshConfig().catch((err) => console.error(`[Paradox] Unhandled error during border config refresh: ${err}`));
    }, CONFIG_REFRESH_INTERVAL_TICKS);
}

/**
 * Stops world border enforcement and releases resources.
 */
export function stopWorldBorderCheck(): void {
    isModuleActive = false;

    if (checkIntervalId !== undefined) {
        system.clearRun(checkIntervalId);
        checkIntervalId = undefined;
    }

    if (configRefreshIntervalId !== undefined) {
        system.clearRun(configRefreshIntervalId);
        configRefreshIntervalId = undefined;
    }

    if (leaveSubscription) {
        EventCoordinator.unsubscribeBefore("playerLeave", leaveSubscription);
        leaveSubscription = undefined;
    }

    if (spawnSubscription) {
        EventCoordinator.unsubscribeAfter("playerSpawn", spawnSubscription);
        spawnSubscription = undefined;
    }

    safeYQueue.length = 0;
    queuedPlayerIds.clear();
    securityClearanceCache.clear();
    lastBorderNudgeCache.clear();
    playerNextCheckTickCache.clear();
}
