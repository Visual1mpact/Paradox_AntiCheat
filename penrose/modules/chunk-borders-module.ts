//imported from Debug Tools (Pete9xi)
import { PlayerCache } from "../classes/cache/player-cache";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";
import { system, Player } from "@minecraft/server";

/**
 * Cached reference to debugDrawer and DebugLine if debug-utilities is available.
 */
let debugDrawerFunc: typeof import("@minecraft/debug-utilities").debugDrawer | undefined;
let debugLineFunc: typeof import("@minecraft/debug-utilities").DebugLine | undefined;

/**
 * Size of a Minecraft chunk along X/Z axis.
 */
const CHUNK_SIZE = 16;

/**
 * Height of a vertical section (used for section rings).
 */
const SECTION_HEIGHT = 16;

/**
 * Minimum world Y level.
 */
const WORLD_MIN_Y = -64;

/**
 * Maximum world Y level.
 */
const WORLD_MAX_Y = 320;

/** Color definitions for different debug elements */
const GRID_COLOR = { red: 1, green: 1, blue: 0, alpha: 0.5 };
const SECTION_COLOR = { red: 0, green: 0.4, blue: 1, alpha: 0.8 };
const PILLAR_COLOR = { red: 0, green: 0.4, blue: 1, alpha: 1 };

interface ChunkBounds {
    x1: number;
    x2: number;
    z1: number;
    z2: number;
}

/**
 * Set of player IDs who currently have chunk debugging enabled.
 */
const debugViewersChunks = new Set<string>();

/**
 * Tracks the last known chunk key for each player.
 * Used to detect when a player moves between chunks.
 */
const lastPlayerChunks = new Map<string, string>();

/**
 * Flag indicating whether debug rendering is active.
 */
let debugEnabled = false;

/**
 * Flag to ensure only one generator job runs at a time.
 */
let isJobRunning = false;

/**
 * Attempts to dynamically load the debug utilities module.
 *
 * This allows the command to gracefully disable itself on Realms,
 * where the @minecraft/debug-utilities module is not available.
 *
 * @returns {Promise<boolean>}
 * True if debugDrawer and DebugLine are available, false otherwise.
 */
async function ensureDebugUtilitiesSupport(): Promise<boolean> {
    if (debugDrawerFunc && debugLineFunc) return true;

    try {
        const debugModule = await import("@minecraft/debug-utilities").catch(() => null);

        if (!debugModule?.debugDrawer || !debugModule?.DebugLine) {
            return false;
        }

        debugDrawerFunc = debugModule.debugDrawer;
        debugLineFunc = debugModule.DebugLine;
        return true;
    } catch {
        return false;
    }
}

/**
 * Adds a debug line visible only to a specific player.
 *
 * @param {Player} player - The player who will see the line
 * @param {{ x: number; y: number; z: number }} start - Starting position of the line
 * @param {{ x: number; y: number; z: number }} end - Ending position of the line
 * @param {{ red: number; green: number; blue: number; alpha: number }} color - RGBA color of the line
 */
function addLine(player: Player, start: { x: number; y: number; z: number }, end: { x: number; y: number; z: number }, color: { red: number; green: number; blue: number; alpha: number }): void {
    if (!debugLineFunc || !debugDrawerFunc) {
        return;
    }
    const line = new debugLineFunc(start, end);

    line.color = color;
    line.visibleTo = [player];
    debugDrawerFunc.addShape(line);
}

/**
 * Checks for player chunk position updates and gathers active viewer targets.
 *
 * @param {Player[]} playersToDraw - Output array to collect valid player targets.
 * @returns {boolean} True if any player moved into a new chunk requiring redrawing.
 */
function checkPlayerChunkMovement(playersToDraw: Player[]): boolean {
    let needsRedraw = false;

    for (const player of PlayerCache.getPlayers()) {
        if (!debugViewersChunks.has(player.id)) continue;

        const loc = PlayerLocationCache.getTransform(player)?.location ?? player.location;
        const px = Math.floor(loc.x);
        const pz = Math.floor(loc.z);

        const chunkX = Math.floor(px / CHUNK_SIZE);
        const chunkZ = Math.floor(pz / CHUNK_SIZE);

        const chunkKey = `${chunkX},${chunkZ}`;
        const previousChunk = lastPlayerChunks.get(player.id);

        if (previousChunk !== chunkKey) {
            needsRedraw = true;
            lastPlayerChunks.set(player.id, chunkKey);
        }

        playersToDraw.push(player);
    }

    return needsRedraw;
}

/**
 * Calculates chunk border boundaries from player location.
 *
 * @param {Player} player - Target player entity.
 * @returns {ChunkBounds} Calculated chunk boundary block coordinates.
 */
function getChunkBounds(player: Player): ChunkBounds {
    const loc = PlayerLocationCache.getTransform(player)?.location ?? player.location;
    const px = Math.floor(loc.x);
    const pz = Math.floor(loc.z);

    const chunkX = Math.floor(px / CHUNK_SIZE) * CHUNK_SIZE;
    const chunkZ = Math.floor(pz / CHUNK_SIZE) * CHUNK_SIZE;

    return {
        x1: chunkX,
        x2: chunkX + CHUNK_SIZE,
        z1: chunkZ,
        z2: chunkZ + CHUNK_SIZE,
    };
}

/**
 * Renders vertical grid lines for X and Z axes.
 *
 * @param {Player} player - Recipient player.
 * @param {ChunkBounds} bounds - Active chunk boundaries.
 * @yields Pauses pass execution to optimize tick budget.
 */
function* renderVerticalGrid(player: Player, bounds: ChunkBounds): Generator<void, void, unknown> {
    const { x1, x2, z1, z2 } = bounds;

    for (let x = x1 + 1; x < x2; x++) {
        addLine(player, { x, y: WORLD_MIN_Y, z: z1 }, { x, y: WORLD_MAX_Y, z: z1 }, GRID_COLOR);
        addLine(player, { x, y: WORLD_MIN_Y, z: z2 }, { x, y: WORLD_MAX_Y, z: z2 }, GRID_COLOR);
        if (x % 4 === 0) yield;
    }

    for (let z = z1 + 1; z < z2; z++) {
        addLine(player, { x: x1, y: WORLD_MIN_Y, z }, { x: x1, y: WORLD_MAX_Y, z }, GRID_COLOR);
        addLine(player, { x: x2, y: WORLD_MIN_Y, z }, { x: x2, y: WORLD_MAX_Y, z }, GRID_COLOR);
        if (z % 4 === 0) yield;
    }
}

/**
 * Renders horizontal grid layers along Y height levels.
 *
 * @param {Player} player - Recipient player.
 * @param {ChunkBounds} bounds - Active chunk boundaries.
 * @yields Pauses pass execution to optimize tick budget.
 */
function* renderHorizontalGrid(player: Player, bounds: ChunkBounds): Generator<void, void, unknown> {
    const { x1, x2, z1, z2 } = bounds;

    for (let y = WORLD_MIN_Y; y < WORLD_MAX_Y; y++) {
        addLine(player, { x: x1, y, z: z1 }, { x: x2, y, z: z1 }, GRID_COLOR);
        addLine(player, { x: x1, y, z: z2 }, { x: x2, y, z: z2 }, GRID_COLOR);
        addLine(player, { x: x1, y, z: z1 }, { x: x1, y, z: z2 }, GRID_COLOR);
        addLine(player, { x: x2, y, z: z1 }, { x: x2, y, z: z2 }, GRID_COLOR);

        if (y % 10 === 0) yield;
    }
}

/**
 * Renders section sub-rings and vertical corner pillars.
 *
 * @param {Player} player - Recipient player.
 * @param {ChunkBounds} bounds - Active chunk boundaries.
 * @yields Pauses pass execution to optimize tick budget.
 */
function* renderRingsAndPillars(player: Player, bounds: ChunkBounds): Generator<void, void, unknown> {
    const { x1, x2, z1, z2 } = bounds;

    for (let y = WORLD_MIN_Y; y <= WORLD_MAX_Y; y += SECTION_HEIGHT) {
        addLine(player, { x: x1, y, z: z1 }, { x: x2, y, z: z1 }, SECTION_COLOR);
        addLine(player, { x: x2, y, z: z1 }, { x: x2, y, z: z2 }, SECTION_COLOR);
        addLine(player, { x: x2, y, z: z2 }, { x: x1, y, z: z2 }, SECTION_COLOR);
        addLine(player, { x: x1, y, z: z2 }, { x: x1, y, z: z1 }, SECTION_COLOR);
        yield;
    }

    const corners = [
        { x: x1, z: z1 },
        { x: x2, z: z1 },
        { x: x2, z: z2 },
        { x: x1, z: z2 },
    ];

    for (const corner of corners) {
        addLine(player, { x: corner.x, y: WORLD_MIN_Y, z: corner.z }, { x: corner.x, y: WORLD_MAX_Y, z: corner.z }, PILLAR_COLOR);
        yield;
    }
}

/**
 * Generator-based loop that progressively renders chunk borders for players.
 *
 * @yields Pauses execution to allow the game engine to process other tasks
 */
function* chunkDebugGenerator(): Generator<void, void, unknown> {
    if (isJobRunning) return;
    isJobRunning = true;

    try {
        if (!debugEnabled) return;

        const playersToDraw: Player[] = [];
        const needsRedraw = checkPlayerChunkMovement(playersToDraw);

        if (!needsRedraw || !debugDrawerFunc) return;

        debugDrawerFunc.removeAll();

        for (const player of playersToDraw) {
            const bounds = getChunkBounds(player);

            yield* renderVerticalGrid(player, bounds);
            yield* renderHorizontalGrid(player, bounds);
            yield* renderRingsAndPillars(player, bounds);

            yield;
        }
    } finally {
        isJobRunning = false;

        if (debugEnabled) {
            system.run(() => {
                system.runJob(chunkDebugGenerator());
            });
        }
    }
}

/**
 * Enables chunk border debugging for all registered viewers.
 * Starts the generator loop if not already running.
 */
export function enable(): void {
    if (debugEnabled) return;

    debugEnabled = true;
    system.runJob(chunkDebugGenerator());
}

/**
 * Disables chunk border debugging and clears all debug visuals.
 */
export function disable(): void {
    if (!debugEnabled) return;

    debugEnabled = false;
    lastPlayerChunks.clear();

    if (debugDrawerFunc) {
        debugDrawerFunc.removeAll();
    }
}

/**
 * Toggles chunk border debugging for a specific player.
 *
 * @param {Player} [sender] - The player issuing the toggle command
 */
export async function toggleChunks(sender?: Player): Promise<void> {
    if (!sender?.id) return;

    const supported = await ensureDebugUtilitiesSupport();

    if (!supported || !debugDrawerFunc || !debugLineFunc) {
        sender.sendMessage("§o§c[Paradox] Chunkborders not supported on this platform.");
        return;
    }

    if (debugViewersChunks.has(sender.id)) {
        debugViewersChunks.delete(sender.id);
        lastPlayerChunks.delete(sender.id);

        if (debugViewersChunks.size === 0) {
            disable();
        }
    } else {
        debugViewersChunks.add(sender.id);
        enable();
    }

    sender.sendMessage(`§2[§7Paradox§2]§o§7 Chunk borders are now §l${debugViewersChunks.has(sender.id) ? "§aenabled§7" : "§4disabled§7"}`);
}
