import { Player, world, system, Dimension, PlayerLeaveBeforeEvent } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { PlayerCache } from "../classes/cache/player-cache";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";
import { EventCoordinator } from "../classes/event-coordinator";

/** Module active execution flag */
let isModuleActive = false;
/** Active state indicator for the Safe-Y generator job worker */
let isSafeYJobActive = false;

/** Interface for dimension border boundary configuration settings */
interface ModuleSettings {
    overworld: number;
    nether: number;
    end: number;
}

/** Interface for world border database module configuration */
interface ModuleConfig {
    enabled?: boolean;
    settings?: ModuleSettings;
}

/** Interface representing a queued player relocation request awaiting safe terrain evaluation */
interface PendingSafeYCheck {
    /** Target player entity handle */
    player: Player;
    /** Dimension instance where relocation is taking place */
    dimension: Dimension;
    /** Initial player position coordinates */
    x: number;
    y: number;
    z: number;
    /** Calculated destination target coordinates */
    targetX: number;
    targetZ: number;
    /** Human-readable dimension name for user notifications */
    dimensionName: string;
    /** True if player significantly breached the boundary threshold */
    beyondBorder: boolean;
}

/** Interface representing dimension bounding bounds cached in memory */
interface BorderBounds {
    overworld: number;
    nether: number;
    end: number;
}

/** Database module configuration pointer */
let moduleConfig: ModuleConfig | undefined;
/** Execution handle for main world border check interval */
let checkIntervalId: number | undefined;
/** Execution handle for database configuration sync interval */
let configRefreshIntervalId: number | undefined;
/** Active configuration sync promise to prevent redundant concurrent fetches */
let configRefreshPromise: Promise<void> | undefined;

/** In-memory lookup map caching security clearance levels by player string ID */
const securityClearanceCache = new Map<string, number>();
/** In-memory map storing tick timestamps of recent boundary nudges for debouncing */
const lastBorderNudgeCache = new Map<string, number>();

/** In-memory cache of world default spawn coordinates */
const cachedSpawnLocation = { x: 0, y: 0, z: 0 };
/** In-memory cache of dimension border sizes */
let cachedBounds: BorderBounds = { overworld: 0, nether: 0, end: 0 };

/** Tick frequency interval for border evaluation sweeps */
const CHECK_INTERVAL_TICKS = 10;
/** Tick frequency interval for database configuration sync (60 seconds) */
const CONFIG_REFRESH_INTERVAL_TICKS = 1200;
/** Tick debounce window threshold to prevent rapid back-to-back border nudges */
const DEBOUNCE_TICKS = 20;
/** Safety distance buffer (in blocks) applied when pushing players inward */
const BUFFER = 3;
/** Maximum vertical offset distance searched during terrain evaluation */
const MAX_SAFE_Y_SEARCH_DISTANCE = 32;

/** FIFO queue storing pending relocation requests */
const safeYQueue: PendingSafeYCheck[] = [];
/** Set of player IDs currently queued for relocation to prevent duplicate processing */
const queuedPlayerIds = new Set<string>();

/** Reference for player leave event listener cleanup */
let leaveSubscription: ((ev: PlayerLeaveBeforeEvent) => void) | undefined;

/**
 * Returns the maximum border radius for a given dimension ID from cached settings.
 *
 * @param dimensionId - The identifier string of the dimension (e.g., 'minecraft:overworld').
 * @returns The configured border radius in blocks, or 0 if disabled.
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
 * Retrieves the security clearance level for a player using in-memory cache.
 * Falls back to native `getDynamicProperty` only if no cached value exists.
 *
 * @param player - The Minecraft Player entity to query.
 * @returns The numerical security clearance level (defaults to 0).
 */
function getSecurityClearance(player: Player): number {
    const clearance = (player.getDynamicProperty("securityClearance") as number) ?? 0;
    securityClearanceCache.set(player.id, clearance);
    return clearance;
}

/**
 * Sets or updates the in-memory security clearance cache for a player.
 * Call this helper whenever clearance levels are updated in commands or UI scripts.
 *
 * @param player - The target player entity or player string ID.
 * @param clearance - The updated clearance level.
 */
export function setPlayerClearanceCache(player: Player | string, clearance: number): void {
    const id = typeof player === "string" ? player : player.id;
    securityClearanceCache.set(id, clearance);
}

/**
 * Purges cached border and security state when a player disconnects.
 *
 * @param playerId - Unique string ID of the departing player.
 */
export function clearPlayerBorderCache(playerId: string): void {
    securityClearanceCache.delete(playerId);
    lastBorderNudgeCache.delete(playerId);
    queuedPlayerIds.delete(playerId);
}

/**
 * Evaluates whether a player has crossed the configured world border boundaries.
 * Queues players for safe relocation if a boundary violation occurs.
 *
 * @param player - The player entity to evaluate.
 */
function checkPlayerBorder(player: Player): void {
    if (!player?.isValid || queuedPlayerIds.has(player.id)) return;

    try {
        // Fast in-memory clearance check; level 4 bypasses world border checks
        if (getSecurityClearance(player) === 4) return;

        const transform = PlayerLocationCache.getTransform(player);
        if (!transform) return;

        const { location: loc, dimension } = transform;
        const borderSize = getConfiguredBorder(dimension.id);
        if (borderSize <= 0) return;

        // Absolute axis boundaries relative to world spawn
        const minX = cachedSpawnLocation.x - borderSize;
        const maxX = cachedSpawnLocation.x + borderSize;
        const minZ = cachedSpawnLocation.z - borderSize;
        const maxZ = cachedSpawnLocation.z + borderSize;

        // Severe breach boundary thresholds (+20 block radius outside border)
        const hardMinX = minX - 20;
        const hardMaxX = maxX + 20;
        const hardMinZ = minZ - 20;
        const hardMaxZ = maxZ + 20;

        const outside = loc.x < hardMinX || loc.x > hardMaxX || loc.z < hardMinZ || loc.z > hardMaxZ;

        let targetX = loc.x;
        let targetZ = loc.z;

        if (outside) {
            // Far boundary breach: return directly to world spawn
            targetX = cachedSpawnLocation.x;
            targetZ = cachedSpawnLocation.z;
        } else {
            // Edge contact: nudge inward with safety buffer
            if (loc.x < minX) targetX = minX + BUFFER;
            else if (loc.x > maxX) targetX = maxX - BUFFER;

            if (loc.z < minZ) targetZ = minZ + BUFFER;
            else if (loc.z > maxZ) targetZ = maxZ - BUFFER;
        }

        if (targetX === loc.x && targetZ === loc.z) return;

        // Debounce soft edge nudges to prevent teleport notification spam
        if (!outside) {
            const nowTick = system.currentTick;
            const lastNudge = lastBorderNudgeCache.get(player.id) ?? 0;
            if (nowTick - lastNudge < DEBOUNCE_TICKS) return;
            lastBorderNudgeCache.set(player.id, nowTick);
        }

        // Lock player from re-queueing and push relocation payload
        queuedPlayerIds.add(player.id);
        safeYQueue.push({
            player,
            dimension,
            x: loc.x,
            y: loc.y,
            z: loc.z,
            targetX,
            targetZ,
            dimensionName: dimension.id === "minecraft:overworld" ? "Overworld" : dimension.id === "minecraft:nether" ? "Nether" : "End",
            beyondBorder: outside,
        });
    } catch (e) {
        console.error(`[Paradox] Error checking player border: ${e}`);
    }
}

/**
 * Checks whether a specific 3-block vertical column can safely accommodate a player entity.
 *
 * @param dimension - Dimension instance to evaluate blocks in.
 * @param x - Target X coordinate.
 * @param testY - Target Y coordinate (representing feet level).
 * @param z - Target Z coordinate.
 * @returns True if feet rest on solid ground and body/head spaces are non-solid.
 */
function findSafeYAt(dimension: Dimension, x: number, testY: number, z: number): boolean {
    const feet = dimension.getBlock({ x, y: testY - 1, z });
    if (!feet?.isSolid) return false;

    const body = dimension.getBlock({ x, y: testY, z });
    if (body?.isSolid) return false;

    const head = dimension.getBlock({ x, y: testY + 1, z });
    if (head?.isSolid) return false;

    return true;
}

/**
 * Batched safe-Y worker generator function.
 * Evaluates solid terrain around target coordinates across generator ticks to preserve FPS.
 */
function* safeYWorker(): Generator<void, void, unknown> {
    if (isSafeYJobActive) return;
    isSafeYJobActive = true;

    try {
        while (isModuleActive && safeYQueue.length > 0) {
            const request = safeYQueue.shift();
            if (!request) break;

            const { player, dimension, y, targetX, targetZ, dimensionName, beyondBorder } = request;

            if (player?.id) queuedPlayerIds.delete(player.id);
            if (!player?.isValid) continue;

            const minHeight = dimension.heightRange?.min ?? -64;
            const maxHeight = dimension.heightRange?.max ?? 320;
            const startY = Math.max(minHeight + 1, Math.min(Math.floor(y), maxHeight - 2));

            let safeY: number | undefined;
            let iterationsThisTick = 0;

            // Search outward vertically from current player Y position
            for (let offset = 0; offset <= MAX_SAFE_Y_SEARCH_DISTANCE; offset++) {
                const candidates = offset === 0 ? [startY] : [startY + offset, startY - offset];

                for (const testY of candidates) {
                    if (testY <= minHeight || testY >= maxHeight - 1) continue;

                    if (findSafeYAt(dimension, targetX, testY, targetZ)) {
                        safeY = testY;
                        break;
                    }

                    // Process up to 32 block queries before yielding control to main thread
                    iterationsThisTick++;
                    if (iterationsThisTick >= 32) {
                        iterationsThisTick = 0;
                        yield;
                    }
                }

                if (safeY !== undefined) break;
            }

            if (!player.isValid) continue;

            // Fallback strategy: Grant slow falling if no solid ground was found nearby
            if (safeY === undefined) {
                const effect = player.getEffect("minecraft:slow_falling");
                if (!effect || effect.duration < 1200) {
                    player.addEffect("minecraft:slow_falling", 1200, { amplifier: 0 });
                }
                safeY = Math.max(minHeight + 1, Math.min(startY, maxHeight - 2));
            }

            // Notify player of border enforcement action
            if (beyondBorder) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 You exceeded the world border in the ${dimensionName} and were returned to spawn.`);
            } else {
                player.sendMessage(`§2[§7Paradox§2]§o§7 You reached the world border in the ${dimensionName}.`);
            }

            // Perform relocation and refresh transform cache
            try {
                player.teleport({ x: targetX, y: safeY, z: targetZ }, { dimension, checkForBlocks: true });
                PlayerLocationCache.refresh(player);
            } catch (e) {
                console.error(`[Paradox] Error teleporting player at world border: ${e}`);
            }

            yield;
        }
    } finally {
        isSafeYJobActive = false;

        // Restart job queue if remaining items exist
        if (isModuleActive && safeYQueue.length > 0) {
            system.runJob(safeYWorker());
        }
    }
}

/**
 * Initiates the safe-Y worker generator job if not already active.
 */
function startSafeYWorker(): void {
    if (!isModuleActive || isSafeYJobActive || safeYQueue.length === 0) return;
    system.runJob(safeYWorker());
}

/**
 * Main execution pass run every check interval.
 * Evaluates active players against configured world border limits.
 */
function runWorldBorderChecks(): void {
    if (!isModuleActive || !moduleConfig?.enabled || !moduleConfig.settings) return;

    for (const player of PlayerCache.getPlayers()) {
        checkPlayerBorder(player);
    }

    startSafeYWorker();
}

/**
 * Asynchronously synchronizes local configuration and spawn caches with the database.
 */
async function refreshConfig(): Promise<void> {
    if (configRefreshPromise) return configRefreshPromise;

    configRefreshPromise = (async () => {
        try {
            moduleConfig = (await paradoxModulesDB.get("worldBorderCheck_b")) as ModuleConfig | undefined;

            if (moduleConfig?.settings) {
                cachedBounds = {
                    overworld: moduleConfig.settings.overworld ?? 0,
                    nether: moduleConfig.settings.nether ?? 0,
                    end: moduleConfig.settings.end ?? 0,
                };
            }

            const spawn = world.getDefaultSpawnLocation();
            cachedSpawnLocation.x = spawn.x;
            cachedSpawnLocation.y = spawn.y;
            cachedSpawnLocation.z = spawn.z;
        } catch (e) {
            console.error(`[Paradox] Failed to load world border configuration: ${e}`);
        } finally {
            configRefreshPromise = undefined;
        }
    })();

    return configRefreshPromise;
}

/**
 * Starts the world border enforcement module, listeners, and recurring background intervals.
 */
export async function startWorldBorderCheck(): Promise<void> {
    if (isModuleActive) return;

    isModuleActive = true;
    PlayerLocationCache.init();

    // Register player disconnect cleanup
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
        refreshConfig();
    }, CONFIG_REFRESH_INTERVAL_TICKS);
}

/**
 * Halts world border checking routines and clears queue state.
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

    safeYQueue.length = 0;
    queuedPlayerIds.clear();
    securityClearanceCache.clear();
    lastBorderNudgeCache.clear();
}
