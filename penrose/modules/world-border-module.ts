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

/** Computed coordinate bounding box metadata */
interface BorderBoundsBox {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
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
 * @param {string} dimensionId - Native dimension identifier (e.g. "minecraft:overworld")
 * @returns {number} Max block radius from center
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
 * @param {string} dimensionId - Native dimension identifier
 * @returns {{ x: number; z: number }} Vector2 representation of center coordinates
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
 *
 * @param {Player} player - Target player entity
 * @returns {number} Active clearance level
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
 * @param {Player} player - Target player entity
 * @param {number} clearance - Clearance level to set
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
 * @param {string} playerId - Unique string identifier of player
 */
export function clearPlayerBorderCache(playerId: string): void {
    securityClearanceCache.delete(playerId);
    lastBorderNudgeCache.delete(playerId);
    queuedPlayerIds.delete(playerId);
    playerNextCheckTickCache.delete(playerId);
}

/**
 * Evaluates clearance status and updates sleep tick trackers for level 4 admins.
 *
 * @param {Player} player - Target player entity
 * @param {number} currentTick - Current server tick
 * @returns {boolean} True if player execution should abort due to admin status or active cooloff.
 */
function checkPlayerClearance(player: Player, currentTick: number): boolean {
    const clearance = getSecurityClearance(player);

    if (clearance >= 4) {
        if (queuedPlayerIds.has(player.id)) {
            queuedPlayerIds.delete(player.id);
        }
        playerNextCheckTickCache.set(player.id, currentTick + ADMIN_BYPASS_SLEEP_TICKS);
        return true;
    }

    const nextCheck = playerNextCheckTickCache.get(player.id) ?? 0;
    if (nextCheck > currentTick + CHECK_INTERVAL_TICKS) {
        playerNextCheckTickCache.delete(player.id);
    }

    return currentTick < (playerNextCheckTickCache.get(player.id) ?? 0) || queuedPlayerIds.has(player.id);
}

/**
 * Computes border proximity sleep duration for player positioning.
 *
 * @param {Vector3} loc - Current player location
 * @param {BorderBoundsBox} bounds - Border box boundary coordinates
 * @returns {number} Sleep duration in ticks (0 if inside alert perimeter)
 */
function calculateProximitySleep(loc: Vector3, bounds: BorderBoundsBox): number {
    const distMinX = loc.x - bounds.minX;
    const distMaxX = bounds.maxX - loc.x;
    const distMinZ = loc.z - bounds.minZ;
    const distMaxZ = bounds.maxZ - loc.z;

    const minDistanceToEdge = Math.min(distMinX, distMaxX, distMinZ, distMaxZ);

    if (minDistanceToEdge > 60) {
        return Math.min(15, Math.max(5, Math.floor((minDistanceToEdge - 30) / 10)));
    }
    return 0;
}

/**
 * Calculates corrected target block coordinates if target exceeds standard bounds.
 *
 * @param {Vector3} loc - Player coordinate location
 * @param {BorderBoundsBox} bounds - Border bounds box details
 * @param {{ x: number; z: number }} center - Dimension center point
 * @param {boolean} outside - True if outside outer safety box
 * @returns {{ targetX: number; targetZ: number }} Calculated destination coordinates
 */
function getClampedTargetCoords(loc: Vector3, bounds: BorderBoundsBox, center: { x: number; z: number }, outside: boolean): { targetX: number; targetZ: number } {
    if (outside) {
        return { targetX: center.x, targetZ: center.z };
    }

    let targetX = loc.x;
    let targetZ = loc.z;

    if (loc.x < bounds.minX) targetX = bounds.minX + BUFFER;
    else if (loc.x > bounds.maxX) targetX = bounds.maxX - BUFFER;

    if (loc.z < bounds.minZ) targetZ = bounds.minZ + BUFFER;
    else if (loc.z > bounds.maxZ) targetZ = bounds.maxZ - BUFFER;

    return { targetX, targetZ };
}

/**
 * Evaluates player location against dimension border boundaries.
 *
 * @param {Player} player - Target player entity
 * @param {number} currentTick - Pre-fetched current server tick
 */
function checkPlayerBorder(player: Player, currentTick: number): void {
    if (checkPlayerClearance(player, currentTick)) return;

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
        const bounds: BorderBoundsBox = {
            minX: center.x - borderSize,
            maxX: center.x + borderSize,
            minZ: center.z - borderSize,
            maxZ: center.z + borderSize,
        };

        const sleepTicks = calculateProximitySleep(loc, bounds);
        if (sleepTicks > 0) {
            playerNextCheckTickCache.set(player.id, currentTick + sleepTicks);
            return;
        }

        const outside = loc.x < bounds.minX - 15 || loc.x > bounds.maxX + 15 || loc.z < bounds.minZ - 15 || loc.z > bounds.maxZ + 15;

        const { targetX, targetZ } = getClampedTargetCoords(loc, bounds, center, outside);

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
 * @param {Dimension} dimension - Target dimension
 * @param {number} x - Block X coordinate
 * @param {number} testY - Block Y coordinate
 * @param {number} z - Block Z coordinate
 * @returns {boolean} True if block column is safe for player placement
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
 * Searches for a valid open space vertically surrounding target coordinates.
 *
 * @param {Dimension} dimension - Dimension instance.
 * @param {number} targetX - Target X coordinate.
 * @param {number} startY - Center Y search coordinate.
 * @param {number} targetZ - Target Z coordinate.
 * @param {number} minHeight - Minimum dimension boundary height.
 * @param {number} maxHeight - Maximum dimension boundary height.
 * @returns {number | undefined} Safe vertical coordinate, or undefined if not found.
 */
function findSafeYSearchRange(dimension: Dimension, targetX: number, startY: number, targetZ: number, minHeight: number, maxHeight: number): number | undefined {
    for (let offset = 0; offset <= MAX_SAFE_Y_SEARCH_DISTANCE; offset++) {
        if (offset === 0) {
            if (findSafeYAt(dimension, targetX, startY, targetZ)) {
                return startY;
            }
        } else {
            const testYUp = startY + offset;
            if (testYUp < maxHeight - 1 && findSafeYAt(dimension, targetX, testYUp, targetZ)) {
                return testYUp;
            }

            const testYDown = startY - offset;
            if (testYDown > minHeight && findSafeYAt(dimension, targetX, testYDown, targetZ)) {
                return testYDown;
            }
        }
    }
    return undefined;
}

/**
 * Teleports player entity and notifies them upon exceeding world boundaries.
 *
 * @param {PendingSafeYCheck} request - Queued teleport check request metadata.
 * @param {number} safeY - Calculated vertical placement coordinate.
 */
function processQueuedTeleport(request: PendingSafeYCheck, safeY: number): void {
    const { player, dimension, targetX, targetZ, dimensionName, beyondBorder } = request;

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
}

/**
 * Validates whether a queued teleport request is still active and eligible for processing.
 *
 * @param {PendingSafeYCheck} request - Target teleport request item.
 * @returns {boolean} True if request is valid and player is eligible.
 */
function isTeleportRequestValid(request: PendingSafeYCheck): boolean {
    const { player } = request;
    if (!player) return false;

    if (player.id) {
        const isStillQueued = queuedPlayerIds.has(player.id);
        queuedPlayerIds.delete(player.id);

        if (!isStillQueued || getSecurityClearance(player) === 4) {
            return false;
        }
    }

    return player.isValid;
}

/**
 * Computes safe Y placement for player or applies fall protection fallback.
 *
 * @param {PendingSafeYCheck} request - Target teleport request item.
 */
function processPlayerSafeY(request: PendingSafeYCheck): void {
    const { player, dimension, targetX, targetZ } = request;

    const currentTransform = PlayerLocationCache.getTransform(player);
    const currentY = currentTransform ? currentTransform.location.y : player.location.y;

    const minHeight = dimension.heightRange?.min ?? -64;
    const maxHeight = dimension.heightRange?.max ?? 320;
    const startY = Math.max(minHeight + 1, Math.min(Math.floor(currentY), maxHeight - 2));

    let safeY = findSafeYSearchRange(dimension, targetX, startY, targetZ, minHeight, maxHeight);

    if (!player.isValid || getSecurityClearance(player) === 4) return;

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

    processQueuedTeleport(request, safeY);
}

/**
 * Job generator worker computing non-blocking safe vertical coordinates for teleportation.
 *
 * @returns {Generator<void, void, unknown>} Worker generator instance.
 */
function* safeYWorker(): Generator<void, void, unknown> {
    if (isSafeYJobActive) return;
    isSafeYJobActive = true;

    try {
        while (isModuleActive && safeYQueue.length > 0) {
            const request = safeYQueue.shift();
            if (!request) continue;

            if (isTeleportRequestValid(request)) {
                processPlayerSafeY(request);
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
        const player = players[i];
        if (player) checkPlayerBorder(player, currentTick);
    }

    startSafeYWorker();
}

/**
 * Safely fetches database configurations and updates world border boundaries.
 *
 * @returns {Promise<void>} Async completion promise.
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
 *
 * @returns {Promise<void>} Async completion promise.
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
