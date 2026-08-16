import { Player, world, system, Dimension } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { PlayerCache } from "../classes/player-cache";

/** Flag indicating whether the module is manually toggled on */
let isModuleActive = false;
/** Flag indicating whether the background generator worker is processing a frame */
let isJobActive = false;

interface ModuleConfig {
    enabled?: boolean;
    settings?: {
        overworld: number;
        nether: number;
        end: number;
    };
}

/**
 * Continuous generator loop that iterates over players to enforce world borders.
 */
function* continuousWorldBorderLoop(moduleConfig: ModuleConfig | undefined): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        if (!isModuleActive) return;

        const isEnabled = moduleConfig?.enabled ?? false;
        if (!isEnabled || !moduleConfig?.settings) {
            return;
        }

        const { overworld, nether, end } = moduleConfig.settings;
        const players = PlayerCache.getPlayers();
        const spawnLocation = world.getDefaultSpawnLocation();
        const checkAndTeleportPlayer = createWorldBorderChecker(spawnLocation);

        for (const player of players) {
            if (!player?.isValid) continue;

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

            // Yield control back to the tick engine after each player
            yield;
        }
    } finally {
        isJobActive = false;

        if (isModuleActive) {
            system.run(async () => {
                // Await DB fetch on the next tick pass before feeding to the generator job
                const nextConfig = (await paradoxModulesDB.get("worldBorderCheck_b")) as ModuleConfig | undefined;
                system.runJob(continuousWorldBorderLoop(nextConfig));
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
export async function startWorldBorderCheck(): Promise<void> {
    if (isModuleActive) return;
    isModuleActive = true;

    if (!isJobActive) {
        try {
            // Fetch initial configuration before passing to the generator
            const initialConfig = (await paradoxModulesDB.get("worldBorderCheck_b")) as ModuleConfig | undefined;

            // Ensure module state didn't flip while awaiting the DB fetch
            if (!isModuleActive) return;

            system.runJob(continuousWorldBorderLoop(initialConfig));
        } catch (e) {
            console.error(`[Paradox] Failed to load config for world border check: ${e}`);
            isModuleActive = false; // Reset state if initialization fails
        }
    }
}

/**
 * Stops the world border system safely.
 */
export function stopWorldBorderCheck(): void {
    isModuleActive = false;
}
