import { Player, world, system, Dimension } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { PlayerCache } from "../classes/player-cache";

let worldBorderJobId: number | null = null;
let worldBorderRunId: number | null = null;

/**
 * Generator that iterates over players to enforce world borders.
 */
function* worldBorderGenerator(): Generator<void, void, unknown> {
    const module = paradoxModulesDB.get("worldBorderCheck_b");
    if (!module?.enabled || !module?.settings) return;

    const { overworld, nether, end } = module.settings;
    const players = PlayerCache.getPlayers();
    const spawnLocation = world.getDefaultSpawnLocation();
    const checkAndTeleportPlayer = createWorldBorderChecker(spawnLocation);

    for (const player of players) {
        if (!player.isValid) continue;
        if ((player.getDynamicProperty("securityClearance") as number) === 4) continue;

        const { x, y, z } = player.location;
        const dimId = player.dimension.id;

        if (dimId === "minecraft:overworld" && overworld > 0) {
            checkAndTeleportPlayer(player, x, y, z, overworld, "Overworld");
        } else if (dimId === "minecraft:nether" && nether > 0) {
            checkAndTeleportPlayer(player, x, y, z, nether, "Nether");
        } else if (dimId === "minecraft:the_end" && end > 0) {
            checkAndTeleportPlayer(player, x, y, z, end, "End");
        }

        yield;
    }
}

/**
 * Creates a border checker function with optimized Y teleport.
 */
function createWorldBorderChecker(spawnLocation: { x: number; y: number; z: number }) {
    const DEBOUNCE_TICKS = 20; // 1 second
    const BUFFER = 2; // deadzone inside border to prevent jitter

    return function checkAndTeleportPlayer(player: Player, x: number, y: number, z: number, borderSize: number, dimension: string) {
        const dx = x - spawnLocation.x;
        const dz = z - spawnLocation.z;

        const beyondBorder = dx > borderSize + 20 || dx < -borderSize - 20 || dz > borderSize + 20 || dz < -borderSize - 20;
        let targetX = beyondBorder ? spawnLocation.x : x;
        let targetZ = beyondBorder ? spawnLocation.z : z;

        // Determine if nudging is needed
        if (!beyondBorder) {
            if (dx < -borderSize + BUFFER) targetX = spawnLocation.x - (borderSize - BUFFER);
            else if (dx > borderSize - BUFFER) targetX = spawnLocation.x + (borderSize - BUFFER);

            if (dz < -borderSize + BUFFER) targetZ = spawnLocation.z - (borderSize - BUFFER);
            else if (dz > borderSize - BUFFER) targetZ = spawnLocation.z + (borderSize - BUFFER);
        }

        // Only teleport if necessary
        const needTeleport = beyondBorder || targetX !== x || targetZ !== z;
        if (!needTeleport) return;

        // Debounce nudges (only for nudges, not full teleport)
        if (!beyondBorder) {
            const nowTick = system.currentTick;
            const lastNudge = (player.getDynamicProperty("lastBorderNudge") as number | null) ?? 0;
            if (nowTick - lastNudge < DEBOUNCE_TICKS) return; // skip if recently nudged
            player.setDynamicProperty("lastBorderNudge", nowTick);
        }

        // Calculate safe Y
        const safeY = findSafeY(player, targetX, y, targetZ);

        // Send messages
        if (beyondBorder) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 You exceeded the world border in the ${dimension} and were returned to spawn.`);
        } else {
            player.sendMessage(`§2[§7Paradox§2]§o§7 You reached the world border in the ${dimension}.`);
        }

        // Teleport
        player.teleport({ x: targetX, y: safeY, z: targetZ }, { dimension: player.dimension, checkForBlocks: true });
    };
}

/**
 * Get valid height range for a dimension safely.
 */
function getDimensionHeightRange(dimension: Dimension) {
    try {
        return dimension.heightRange;
    } catch (error) {
        console.error(`[Paradox] Error accessing height range: ${error}`);
        return { min: -64, max: 320 };
    }
}

/**
 * Optimized safe Y calculation preventing suffocation.
 */
function findSafeY(player: Player, x: number, y: number, z: number): number {
    const { min: minHeight, max: maxHeight } = getDimensionHeightRange(player.dimension);
    const maxSearchDistance = 32;
    const startY = Math.max(minHeight + 1, Math.min(y, maxHeight - 2)); // leave room for head

    // Search upwards first, then downwards
    for (let offset = 0; offset <= maxSearchDistance; offset++) {
        const candidates = [startY + offset, startY - offset].filter((testY) => testY > minHeight && testY < maxHeight - 1);

        for (const testY of candidates) {
            const feet = player.dimension.getBlock({ x, y: testY - 1, z });
            const body = player.dimension.getBlock({ x, y: testY, z });
            const head = player.dimension.getBlock({ x, y: testY + 1, z });

            if (!feet || !body || !head) continue;

            // Feet must be solid, body & head must be air
            if (feet.isSolid && !body.isSolid && !head.isSolid) {
                return testY;
            }
        }
    }

    // Fallback: give slow falling if no safe spot found
    const effect = player.getEffect("minecraft:slow_falling");
    if (!effect || effect.duration < 1200) {
        player.addEffect("minecraft:slow_falling", 1200, { amplifier: 0 });
    }

    return Math.max(minHeight + 1, Math.min(startY, maxHeight - 2));
}

/**
 * Executes the world border generator as a job.
 */
async function executeWorldBorderCheck(): Promise<void> {
    if (worldBorderJobId !== null) system.clearJob(worldBorderJobId);

    const jobPromise = new Promise<void>((resolve) => {
        function* runner() {
            yield* worldBorderGenerator();
            resolve();
        }
        worldBorderJobId = system.runJob(runner());
    });

    await jobPromise;
}

/**
 * Start world border enforcement.
 */
export async function startWorldBorderCheck(): Promise<void> {
    if (worldBorderRunId !== null) system.clearRun(worldBorderRunId);
    if (worldBorderJobId !== null) system.clearJob(worldBorderJobId);

    let isRunning = false;
    let runIdBackup: number;

    worldBorderRunId = system.runInterval(async () => {
        if (isRunning) {
            system.clearRun(worldBorderRunId as number);
            worldBorderRunId = runIdBackup;
            return;
        }

        runIdBackup = worldBorderRunId!;
        isRunning = true;

        await executeWorldBorderCheck();
        isRunning = false;
    }, 20);
}

/**
 * Stops the world border system.
 */
export function stopWorldBorderCheck(): void {
    if (worldBorderJobId !== null) system.clearJob(worldBorderJobId);
    if (worldBorderRunId !== null) system.clearRun(worldBorderRunId);
}
