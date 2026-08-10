//imported from Debug Tools (Pete9xi)
import { PlayerCache } from "../classes/player-cache";
import { system } from "@minecraft/server";

/**
 * Cached reference to debugDrawer and DebugLine if debug-utilities is available.
 */
let debugDrawerFunc: typeof import("@minecraft/debug-utilities").debugDrawer | undefined;
let debugLineFunc: typeof import("@minecraft/debug-utilities").DebugLine | undefined;

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
    if (debugDrawerFunc) return true;
    if (debugLineFunc) return true;

    try {
        const debugModule = await import("@minecraft/debug-utilities");
        debugDrawerFunc = debugModule.debugDrawer;
        debugLineFunc = debugModule.DebugLine;
        return true;
    } catch {
        return false;
    }
}

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
 * Adds a debug line visible only to a specific player.
 *
 * @param player - The player who will see the line
 * @param start - Starting position of the line
 * @param end - Ending position of the line
 * @param color - RGBA color of the line
 */
function addLine(player: any, start: { x: number; y: number; z: number }, end: { x: number; y: number; z: number }, color: { red: number; green: number; blue: number; alpha: number }) {
    if (!debugLineFunc) {
        console.log("Debug utilities are not available. AddlineFunction.");
        return;
    }
    const line = new debugLineFunc(start, end);

    line.color = color;
    line.visibleTo = [player];
    if (!debugDrawerFunc) {
        console.log("Debug utilities are not available. AddlineFunction.");
        return;
    }
    debugDrawerFunc.addShape(line);
}

/**
 * Flag to ensure only one generator job runs at a time.
 */
let isJobRunning = false;

/**
 * Generator-based loop that progressively renders chunk borders for players.
 *
 * This function:
 * - Detects when players move between chunks
 * - Clears and redraws debug visuals only when necessary
 * - Spreads rendering work across multiple ticks using `yield`
 *   to prevent performance spikes
 *
 * @yields Pauses execution to allow the game engine to process other tasks
 */
function* chunkDebugGenerator(): Generator<void, void, unknown> {
    if (isJobRunning) return;
    isJobRunning = true;

    try {
        // Exit early if debug is disabled
        if (!debugEnabled) return;

        let needsRedraw = false;

        /**
         * List of players that need chunk borders drawn.
         */
        const playersToDraw: any[] = [];

        /**
         * STEP 1: Detect chunk movement for each tracked player.
         */
        for (const player of PlayerCache.getPlayers()) {
            if (!debugViewersChunks.has(player.id)) continue;

            const px = Math.floor(player.location.x);
            const pz = Math.floor(player.location.z);

            const chunkX = Math.floor(px / CHUNK_SIZE);
            const chunkZ = Math.floor(pz / CHUNK_SIZE);

            const chunkKey = `${chunkX},${chunkZ}`;
            const previousChunk = lastPlayerChunks.get(player.id);

            // Mark redraw if player entered a new chunk
            if (previousChunk !== chunkKey) {
                needsRedraw = true;
                lastPlayerChunks.set(player.id, chunkKey);
            }

            playersToDraw.push(player);
        }

        /**
         * If no players changed chunks, skip rendering entirely.
         */
        if (!needsRedraw) return;

        /**
         * Clear all existing debug shapes before redrawing.
         */
        if (!debugDrawerFunc) {
            console.log("Debug utilities are not available.");
            return;
        }
        debugDrawerFunc.removeAll();

        /**
         * STEP 2: Render chunk borders progressively.
         */
        for (const player of playersToDraw) {
            const px = Math.floor(player.location.x);
            const pz = Math.floor(player.location.z);

            const chunkX = Math.floor(px / CHUNK_SIZE) * CHUNK_SIZE;
            const chunkZ = Math.floor(pz / CHUNK_SIZE) * CHUNK_SIZE;

            const x1 = chunkX;
            const x2 = chunkX + CHUNK_SIZE;
            const z1 = chunkZ;
            const z2 = chunkZ + CHUNK_SIZE;

            /**
             * Color definitions for different debug elements.
             */
            const gridColor = { red: 1, green: 1, blue: 0, alpha: 0.5 };
            const sectionColor = { red: 0, green: 0.4, blue: 1, alpha: 0.8 };
            const pillarColor = { red: 0, green: 0.4, blue: 1, alpha: 1 };
            /*
             * Yellow vertical grid lines
             */
            // Vertical grid (X direction)
            for (let x = x1 + 1; x < x2; x++) {
                addLine(player, { x, y: WORLD_MIN_Y, z: z1 }, { x, y: WORLD_MAX_Y, z: z1 }, gridColor);
                addLine(player, { x, y: WORLD_MIN_Y, z: z2 }, { x, y: WORLD_MAX_Y, z: z2 }, gridColor);

                if (x % 4 === 0) yield; // prevent overload
            }

            // Vertical grid (Z direction)
            for (let z = z1 + 1; z < z2; z++) {
                addLine(player, { x: x1, y: WORLD_MIN_Y, z }, { x: x1, y: WORLD_MAX_Y, z }, gridColor);
                addLine(player, { x: x2, y: WORLD_MIN_Y, z }, { x: x2, y: WORLD_MAX_Y, z }, gridColor);

                if (z % 4 === 0) yield;
            }

            /**
             * Draw horizontal grid layers across Y axis.
             * This is the most expensive loop, so we yield periodically.
             */
            for (let y = WORLD_MIN_Y; y < WORLD_MAX_Y; y++) {
                addLine(player, { x: x1, y, z: z1 }, { x: x2, y, z: z1 }, gridColor);
                addLine(player, { x: x1, y, z: z2 }, { x: x2, y, z: z2 }, gridColor);
                addLine(player, { x: x1, y, z: z1 }, { x: x1, y, z: z2 }, gridColor);
                addLine(player, { x: x2, y, z: z1 }, { x: x2, y, z: z2 }, gridColor);

                // Yield every ~10 iterations to prevent lag spikes
                if (y % 10 === 0) yield;
            }

            /**
             * Draw section rings every 16 blocks vertically.
             */
            for (let y = WORLD_MIN_Y; y <= WORLD_MAX_Y; y += SECTION_HEIGHT) {
                addLine(player, { x: x1, y, z: z1 }, { x: x2, y, z: z1 }, sectionColor);
                addLine(player, { x: x2, y, z: z1 }, { x: x2, y, z: z2 }, sectionColor);
                addLine(player, { x: x2, y, z: z2 }, { x: x1, y, z: z2 }, sectionColor);
                addLine(player, { x: x1, y, z: z2 }, { x: x1, y, z: z1 }, sectionColor);

                yield;
            }

            /**
             * Draw vertical corner pillars of the chunk.
             */
            const corners = [
                { x: x1, z: z1 },
                { x: x2, z: z1 },
                { x: x2, z: z2 },
                { x: x1, z: z2 },
            ];

            for (const corner of corners) {
                addLine(player, { x: corner.x, y: WORLD_MIN_Y, z: corner.z }, { x: corner.x, y: WORLD_MAX_Y, z: corner.z }, pillarColor);

                yield;
            }

            /**
             * Yield between players to distribute workload evenly.
             */
            yield;
        }
    } finally {
        /**
         * Unlock the job so it can run again.
         */
        isJobRunning = false;

        /**
         * Schedule the next execution if still enabled.
         */
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
export function enable() {
    if (debugEnabled) return;

    debugEnabled = true;

    system.runJob(chunkDebugGenerator());
}

/**
 * Disables chunk border debugging and clears all debug visuals.
 */
export function disable() {
    if (!debugEnabled) return;

    debugEnabled = false;

    lastPlayerChunks.clear();
    if (!debugDrawerFunc) {
        console.log("Debug utilities are not available.");
        return;
    }
    debugDrawerFunc.removeAll();
}

/**
 * Toggles chunk border debugging for a specific player.
 *
 * @param sender - The player issuing the toggle command
 */
export async function toggleChunks(sender?: any) {
    if (!sender?.id) return;
    /**
     * Verify server-admin module availability.
     * Prevents errors when running on Realms.
     */
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

    sender.sendMessage(`§2[§7Paradox§2]§o§7 Chunk borders are now §l${debugViewersChunks.has(sender.id) ? "ENABLED" : "DISABLED"}§7`);
}
