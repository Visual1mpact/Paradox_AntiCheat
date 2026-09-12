import { Player, world, system, Dimension, PlayerLeaveBeforeEvent, PlayerSpawnAfterEvent, Vector3 } from "@minecraft/server";
import { PlayerCache } from "../classes/cache/player-cache";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";
import { EventCoordinator } from "../classes/core/event-coordinator";

/** Structure defining per-dimension border distance limits */
export interface BorderBounds {
    /** Overworld max distance from center in blocks */
    overworld: number;
    /** Nether max distance from center in blocks */
    nether: number;
    /** End max distance from center in blocks */
    end: number;
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

let checkIntervalId: number | undefined;

/** Fast in-memory caches */
const securityClearanceCache = new Map<string, number>();
const lastBorderNudgeCache = new Map<string, number>();
const playerNextCheckTickCache = new Map<string, number>();
const lastWarningTickCache = new Map<string, number>();

/** Cached spawn location for Overworld centering */
const cachedSpawnLocation: Vector3 = { x: 0, y: 0, z: 0 };
let cachedBounds: BorderBounds = { overworld: 0, nether: 0, end: 0 };

/** Timing & Distance Constants */
const CHECK_INTERVAL_TICKS = 10;
const DEBOUNCE_TICKS = 10;
const BUFFER = 2;
const MAX_SAFE_Y_SEARCH_DISTANCE = 32;

/** Border Warning System Constants */
const WARNING_DISTANCE_BLOCKS = 15;
const WARNING_DEBOUNCE_TICKS = 10;
const PARTICLE_WALL_SPAN_BLOCKS = 12;
const PARTICLE_WALL_STEP_BLOCKS = 0.5;

/** High-performance processing queue */
const safeYQueue: PendingSafeYCheck[] = [];
const queuedPlayerIds = new Set<string>();

/** Listener unsubscribe handlers */
let leaveSubscription: ((ev: PlayerLeaveBeforeEvent) => void) | undefined;
let spawnSubscription: ((ev: PlayerSpawnAfterEvent) => void) | undefined;

/** Zero-allocation reusable object structures */
const blockQueryLoc: Vector3 = { x: 0, y: 0, z: 0 };
const teleportLoc: Vector3 = { x: 0, y: 0, z: 0 };
const particleLoc: Vector3 = { x: 0, y: 0, z: 0 };

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

    if (clearance === 4 && queuedPlayerIds.has(player.id)) {
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
    lastWarningTickCache.delete(playerId);
}

/**
 * Computes signed/absolute distance from location to border edges.
 *
 * @param {Vector3} loc - Current player location
 * @param {BorderBoundsBox} bounds - Border box boundary coordinates
 * @returns {{ absoluteDistance: number; isOutside: boolean }} Edge offset metrics
 */
function getBorderEdgeMetrics(loc: Vector3, bounds: BorderBoundsBox): { absoluteDistance: number; isOutside: boolean } {
    const isOutside = loc.x < bounds.minX || loc.x > bounds.maxX || loc.z < bounds.minZ || loc.z > bounds.maxZ;

    const distMinX = Math.abs(loc.x - bounds.minX);
    const distMaxX = Math.abs(bounds.maxX - loc.x);
    const distMinZ = Math.abs(loc.z - bounds.minZ);
    const distMaxZ = Math.abs(bounds.maxZ - loc.z);

    const absoluteDistance = Math.min(distMinX, distMaxX, distMinZ, distMaxZ);

    return { absoluteDistance, isOutside };
}

/**
 * Computes border proximity sleep duration for player positioning.
 *
 * @param {Vector3} loc - Current player location
 * @param {BorderBoundsBox} bounds - Border box boundary coordinates
 * @returns {number} Sleep duration in ticks (0 if inside alert perimeter)
 */
function calculateProximitySleep(loc: Vector3, bounds: BorderBoundsBox): number {
    const { absoluteDistance } = getBorderEdgeMetrics(loc, bounds);

    if (absoluteDistance > WARNING_DISTANCE_BLOCKS + 30) {
        return Math.min(15, Math.max(5, Math.floor((absoluteDistance - 30) / 10)));
    }
    return 0;
}

/**
 * Spawns a high-density vertical grid of redstone particles forming a solid wall segment.
 *
 * @param {Dimension} dimension - Target dimension instance
 * @param {Vector3} loc - Player coordinate position
 * @param {BorderBoundsBox} bounds - Active border bounding metadata
 */
function renderParticleWallSegment(dimension: Dimension, loc: Vector3, bounds: BorderBoundsBox): void {
    const distMinX = Math.abs(loc.x - bounds.minX);
    const distMaxX = Math.abs(bounds.maxX - loc.x);
    const distMinZ = Math.abs(loc.z - bounds.minZ);
    const distMaxZ = Math.abs(bounds.maxZ - loc.z);

    const minDistance = Math.min(distMinX, distMaxX, distMinZ, distMaxZ);

    const halfSpan = PARTICLE_WALL_SPAN_BLOCKS / 2;
    const startY = Math.floor(loc.y) - 1;

    if (minDistance === distMinX || minDistance === distMaxX) {
        const wallX = minDistance === distMinX ? bounds.minX : bounds.maxX;
        particleLoc.x = wallX;

        for (let zOffset = -halfSpan; zOffset <= halfSpan; zOffset += PARTICLE_WALL_STEP_BLOCKS) {
            particleLoc.z = loc.z + zOffset;
            for (let yOffset = 0; yOffset <= 5; yOffset += 0.5) {
                particleLoc.y = startY + yOffset;
                dimension.spawnParticle("minecraft:redstone_ore_dust_particle", particleLoc);
            }
        }
    } else {
        const wallZ = minDistance === distMinZ ? bounds.minZ : bounds.maxZ;
        particleLoc.z = wallZ;

        for (let xOffset = -halfSpan; xOffset <= halfSpan; xOffset += PARTICLE_WALL_STEP_BLOCKS) {
            particleLoc.x = loc.x + xOffset;
            for (let yOffset = 0; yOffset <= 5; yOffset += 0.5) {
                particleLoc.y = startY + yOffset;
                dimension.spawnParticle("minecraft:redstone_ore_dust_particle", particleLoc);
            }
        }
    }
}

/**
 * Renders proximity warning effects (Action bar text, dynamic audio pitch/volume, and particle wall).
 *
 * @param {Player} player - Target player instance
 * @param {Dimension} dimension - Current player dimension
 * @param {Vector3} loc - Current location coordinates
 * @param {BorderBoundsBox} bounds - Border box metadata
 * @param {number} distance - Absolute distance to nearest edge in blocks
 * @param {boolean} isOutside - True if player is past the boundary
 * @param {number} currentTick - Active server tick
 */
function handleBorderWarning(player: Player, dimension: Dimension, loc: Vector3, bounds: BorderBoundsBox, distance: number, isOutside: boolean, currentTick: number): void {
    const lastWarn = lastWarningTickCache.get(player.id) ?? 0;
    if (currentTick - lastWarn < WARNING_DEBOUNCE_TICKS) return;
    lastWarningTickCache.set(player.id, currentTick);

    const roundedDistance = Math.max(0, Math.floor(distance));

    try {
        // 1. Action bar alert
        if (isOutside) {
            player.onScreenDisplay.setActionBar(`§e§lNOTICE:§r §7Beyond World Border (§c+${roundedDistance}m§7)`);
        } else {
            player.onScreenDisplay.setActionBar(`§c§lWARNING:§r §7Approaching World Border (§e${roundedDistance}m§7 away)`);
        }

        // 2. Proximity Sound Cue
        const pitch = Math.min(2.0, Math.max(0.5, 2.0 - distance / WARNING_DISTANCE_BLOCKS));
        const volume = Math.min(0.8, Math.max(0.2, 0.8 - (distance / WARNING_DISTANCE_BLOCKS) * 0.6));

        player.playSound("note.harp", { pitch, volume });

        // 3. Render High-Density 3D Particle Wall
        renderParticleWallSegment(dimension, loc, bounds);
    } catch {
        // Ignored if entity or screen display call fails
    }
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
 * Computes dimension border bounding box coordinates.
 *
 * @param {string} dimensionId - Target dimension identifier
 * @returns {{ borderSize: number; center: { x: number; z: number }; bounds: BorderBoundsBox }} Bounding box structure
 */
function getBorderBoundsBox(dimensionId: string): { borderSize: number; center: { x: number; z: number }; bounds: BorderBoundsBox } {
    const borderSize = getConfiguredBorder(dimensionId);
    const center = getDimensionCenter(dimensionId);
    const bounds: BorderBoundsBox = {
        minX: center.x - borderSize,
        maxX: center.x + borderSize,
        minZ: center.z - borderSize,
        maxZ: center.z + borderSize,
    };
    return { borderSize, center, bounds };
}

/**
 * Evaluates initial evaluation conditions to skip processing early.
 *
 * @param {Player} player - Target player instance
 * @param {number} currentTick - Active server tick
 * @param {Vector3} loc - Current player location
 * @param {BorderBoundsBox} bounds - Active border bounding metadata
 * @returns {boolean} True if border processing should halt
 */
function shouldSkipBorderCheck(player: Player, currentTick: number, loc: Vector3, bounds: BorderBoundsBox): boolean {
    const sleepTicks = calculateProximitySleep(loc, bounds);
    if (sleepTicks > 0) {
        playerNextCheckTickCache.set(player.id, currentTick + sleepTicks);
        return true;
    }
    return false;
}

/**
 * Formats dimension native string identifier into display friendly format.
 *
 * @param {string} dimensionId - Native dimension string (e.g. "minecraft:overworld")
 * @returns {string} Friendly display label
 */
function getDimensionDisplayName(dimensionId: string): string {
    if (dimensionId === "minecraft:overworld") return "Overworld";
    if (dimensionId === "minecraft:nether") return "Nether";
    return "End";
}

/**
 * Queues player for safe Y correction job.
 *
 * @param {Player} player - Target player instance
 * @param {Dimension} dimension - Current dimension instance
 * @param {number} targetX - Target clamped X coordinate
 * @param {number} targetZ - Target clamped Z coordinate
 * @param {boolean} outsideFar - True if player crossed far perimeter
 */
function queueBorderTeleport(player: Player, dimension: Dimension, targetX: number, targetZ: number, outsideFar: boolean): void {
    queuedPlayerIds.add(player.id);
    safeYQueue.push({
        player,
        dimension,
        targetX,
        targetZ,
        dimensionName: getDimensionDisplayName(dimension.id),
        beyondBorder: outsideFar,
    });
}

/**
 * Evaluates player location against dimension border boundaries.
 *
 * @param {Player} player - Target player entity
 * @param {number} currentTick - Pre-fetched current server tick
 */
function checkPlayerBorder(player: Player, currentTick: number): void {
    const nextCheck = playerNextCheckTickCache.get(player.id) ?? 0;
    if (currentTick < nextCheck || queuedPlayerIds.has(player.id)) return;

    try {
        const transform = PlayerLocationCache.getTransform(player);
        if (!transform) return;

        const { location: loc, dimension } = transform;
        const { borderSize, center, bounds } = getBorderBoundsBox(dimension.id);
        if (borderSize <= 0) {
            playerNextCheckTickCache.set(player.id, currentTick + 100);
            return;
        }

        if (shouldSkipBorderCheck(player, currentTick, loc, bounds)) return;

        const { absoluteDistance, isOutside } = getBorderEdgeMetrics(loc, bounds);

        if (absoluteDistance <= WARNING_DISTANCE_BLOCKS) {
            handleBorderWarning(player, dimension, loc, bounds, absoluteDistance, isOutside, currentTick);
        }

        if (getSecurityClearance(player) === 4) {
            playerNextCheckTickCache.set(player.id, currentTick + CHECK_INTERVAL_TICKS);
            return;
        }

        const outsideFar = loc.x < bounds.minX - 15 || loc.x > bounds.maxX + 15 || loc.z < bounds.minZ - 15 || loc.z > bounds.maxZ + 15;
        const { targetX, targetZ } = getClampedTargetCoords(loc, bounds, center, outsideFar);

        if (targetX === loc.x && targetZ === loc.z) {
            playerNextCheckTickCache.set(player.id, currentTick + CHECK_INTERVAL_TICKS);
            return;
        }

        if (!outsideFar) {
            const lastNudge = lastBorderNudgeCache.get(player.id) ?? 0;
            if (currentTick - lastNudge < DEBOUNCE_TICKS) return;
            lastBorderNudgeCache.set(player.id, currentTick);
        }

        queueBorderTeleport(player, dimension, targetX, targetZ, outsideFar);
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
    if (!isModuleActive) return;

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
 * Initializes and starts world border monitoring services with provided dimensions.
 *
 * @param {BorderBounds} bounds - Per-dimension boundary limits.
 */
export function startWorldBorderCheck(bounds: BorderBounds): void {
    cachedBounds = bounds;

    const spawn = world.getDefaultSpawnLocation();
    cachedSpawnLocation.x = spawn.x;
    cachedSpawnLocation.y = spawn.y;
    cachedSpawnLocation.z = spawn.z;

    if (isModuleActive) return;
    isModuleActive = true;

    PlayerLocationCache.init();

    if (!spawnSubscription) {
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
    }

    if (!leaveSubscription) {
        leaveSubscription = (ev: PlayerLeaveBeforeEvent) => {
            if (ev.player?.id) {
                clearPlayerBorderCache(ev.player.id);
            }
        };
        EventCoordinator.subscribeBefore("playerLeave", leaveSubscription);
    }

    if (checkIntervalId === undefined) {
        checkIntervalId = system.runInterval(runWorldBorderChecks, CHECK_INTERVAL_TICKS);
    }
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
    lastWarningTickCache.clear();
}
