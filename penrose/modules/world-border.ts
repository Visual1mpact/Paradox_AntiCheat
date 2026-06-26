import { Player, world, system, Dimension } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { PlayerCache } from "../classes/player-cache";

/** Flag indicating whether the module is manually toggled on */
let isModuleActive = false;
/** Flag indicating whether the background generator worker is processing a frame */
let isJobActive = false;

/**
 * Continuous generator loop that iterates over players to enforce world borders.
 */
function* continuousWorldBorderLoop(): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        // Safe exit if the module was toggled off or database tracking is disabled
        if (!isModuleActive) return;

        const module = paradoxModulesDB.get("worldBorderCheck_b");
        if (!module?.enabled || !module?.settings) {
            yield;
            return;
        }

        const { overworld, nether, end } = module.settings;
        const players = PlayerCache.getPlayers();
        const spawnLocation = world.getDefaultSpawnLocation();
        const checkAndTeleportPlayer = createWorldBorderChecker(spawnLocation);

        for (const player of players) {
            // Robust check handle: handles both legacy properties and modern API method call states
            const isValid = player.isValid;
            if (!isValid) continue;

            try {
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
            } catch (e) {
                console.error(`[Paradox] Error checking player border: ${e}`);
            }

            // Yield control back to the engine after processing this player
            yield;
        }
    } finally {
        // Unlock job state for the current pass
        isJobActive = false;

        // Only queue up the next loop execution if the module state remains running
        if (isModuleActive) {
            system.run(() => {
                system.runJob(continuousWorldBorderLoop());
            });
        }
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

        if (!beyondBorder) {
            if (dx < -borderSize + BUFFER) targetX = spawnLocation.x - (borderSize - BUFFER);
            else if (dx > borderSize - BUFFER) targetX = spawnLocation.x + (borderSize - BUFFER);

            if (dz < -borderSize + BUFFER) targetZ = spawnLocation.z - (borderSize - BUFFER);
            else if (dz > borderSize - BUFFER) targetZ = spawnLocation.z + (borderSize - BUFFER);
        }

        const needTeleport = beyondBorder || targetX !== x || targetZ !== z;
        if (!needTeleport) return;

        if (!beyondBorder) {
            const nowTick = system.currentTick;
            const lastNudge = (player.getDynamicProperty("lastBorderNudge") as number | null) ?? 0;
            if (nowTick - lastNudge < DEBOUNCE_TICKS) return;
            player.setDynamicProperty("lastBorderNudge", nowTick);
        }

        const safeY = findSafeY(player, targetX, y, targetZ);

        if (beyondBorder) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 You exceeded the world border in the ${dimension} and were returned to spawn.`);
        } else {
            player.sendMessage(`§2[§7Paradox§2]§o§7 You reached the world border in the ${dimension}.`);
        }

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
    const startY = Math.max(minHeight + 1, Math.min(y, maxHeight - 2));

    for (let offset = 0; offset <= maxSearchDistance; offset++) {
        const candidates = [startY + offset, startY - offset].filter((testY) => testY > minHeight && testY < maxHeight - 1);

        for (const testY of candidates) {
            const feet = player.dimension.getBlock({ x, y: testY - 1, z });
            const body = player.dimension.getBlock({ x, y: testY, z });
            const head = player.dimension.getBlock({ x, y: testY + 1, z });

            if (!feet || !body || !head) continue;

            if (feet.isSolid && !body.isSolid && !head.isSolid) {
                return testY;
            }
        }
    }

    const effect = player.getEffect("minecraft:slow_falling");
    if (!effect || effect.duration < 1200) {
        player.addEffect("minecraft:slow_falling", 1200, { amplifier: 0 });
    }

    return Math.max(minHeight + 1, Math.min(startY, maxHeight - 2));
}

/**
 * Starts periodic world border checks smoothly.
 */
export function startWorldBorderCheck(): void {
    if (isModuleActive) return;
    isModuleActive = true;

    if (!isJobActive) {
        system.runJob(continuousWorldBorderLoop());
    }
}

/**
 * Stops the world border system safely.
 */
export function stopWorldBorderCheck(): void {
    isModuleActive = false;
}
