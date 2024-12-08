import { Player, world, system, Dimension } from "@minecraft/server";
import { getParadoxModules } from "../utility/paradox-modules-manager";

let currentJobId: number | null = null;

/**
 * Generator function for world border enforcement tasks.
 * Checks player locations and teleports them if they exceed the world border.
 * @param {number} jobId - The ID of the job to be managed.
 * @yields {void} - Yields control to allow other tasks to run.
 */
function* worldBorderGenerator(jobId: number): Generator<void, void, unknown> {
    const modeKeys = {
        worldBorderCheck: "worldBorderCheck_b",
        worldBorderSettings: "worldBorder_settings",
    };

    while (true) {
        // Retrieve the current dynamic properties for world border settings
        let paradoxModules = getParadoxModules(world);

        const worldBorderEnabled = paradoxModules[modeKeys.worldBorderCheck] as boolean;
        const worldBorderSettings = paradoxModules[modeKeys.worldBorderSettings] as {
            overworld: number;
            nether: number;
            end: number;
        };

        const overworldBorder = worldBorderSettings?.overworld ?? 0;
        const netherBorder = worldBorderSettings?.nether ?? 0;
        const endBorder = worldBorderSettings?.end ?? 0;

        // Unsubscribe if world border feature is disabled
        if (!worldBorderEnabled) {
            system.clearJob(jobId);
            return;
        }

        const players = world.getPlayers();

        for (const player of players) {
            if (player.isValid() && (player.getDynamicProperty("securityClearance") as number) === 4) {
                continue;
            }
            const { x, y, z } = player.location;

            // Handle world border enforcement for each dimension
            if (player.dimension.id === "minecraft:overworld" && overworldBorder > 0) {
                checkAndTeleportPlayer(player, x, y, z, overworldBorder, "overworld");
            } else if (player.dimension.id === "minecraft:nether" && netherBorder > 0) {
                checkAndTeleportPlayer(player, x, y, z, netherBorder, "nether");
            } else if (player.dimension.id === "minecraft:the_end" && endBorder > 0) {
                checkAndTeleportPlayer(player, x, y, z, endBorder, "end");
            }
            yield; // Yield after processing each player to avoid blocking
        }
        yield; // Yield control to other tasks
    }
}

/**
 * Checks if the player is outside the world border and teleports them if necessary.
 * @param {Player} player - The player to check and possibly teleport.
 * @param {number} x - The player's current X coordinate.
 * @param {number} y - The player's current Y coordinate.
 * @param {number} z - The player's current Z coordinate.
 * @param {number} borderSize - The size of the world border.
 * @param {string} dimension - The dimension the player is in.
 */
function checkAndTeleportPlayer(player: Player, x: number, y: number, z: number, borderSize: number, dimension: string) {
    const borderOffset = borderSize - 3;

    if (x > borderSize || x < -borderSize || z > borderSize || z < -borderSize) {
        const targetX = x < -borderSize ? -borderOffset + 6 : x >= borderSize ? borderOffset - 6 : x;
        const targetZ = z < -borderSize ? -borderOffset + 6 : z >= borderSize ? borderOffset - 6 : z;
        const safeY = findSafeY(player, targetX, y, targetZ);

        player.sendMessage(`§2[§7Paradox§2]§o§7 You have reached the world border in the ${dimension}.`);
        player.teleport({ x: targetX, y: safeY, z: targetZ }, { dimension: player.dimension });
    }
}

/**
 * Finds the valid height range for a dimension.
 * @param {Dimension} dimension - The dimension to query.
 * @returns {{ min: number; max: number }} - The minimum and maximum valid heights.
 */
function getDimensionHeightRange(dimension: Dimension): { min: number; max: number } {
    try {
        const range = dimension.heightRange;
        return { min: range.min, max: range.max };
    } catch (error) {
        console.error(`Error accessing height range for dimension: ${error}`);
        // Return default values (Overworld limits as a fallback)
        return { min: -64, max: 320 };
    }
}

/**
 * Finds a safe Y coordinate for teleportation by checking surrounding blocks.
 * @param {Player} player - The player for whom to find a safe Y coordinate.
 * @param {number} x - The X coordinate to check.
 * @param {number} y - The initial Y coordinate to start checking from.
 * @param {number} z - The Z coordinate to check.
 * @returns {number} - The safe Y coordinate.
 */
function findSafeY(player: Player, x: number, y: number, z: number): number {
    const { min: minHeight, max: maxHeight } = getDimensionHeightRange(player.dimension);
    let safeY = Math.max(minHeight, Math.min(y, maxHeight - 1)); // Clamp Y to valid range

    while (safeY >= minHeight && safeY < maxHeight) {
        const headPosition = { x: x, y: safeY + 1, z: z };
        const bodyPosition = { x: x, y: safeY, z: z };
        const feetPosition = { x: x, y: safeY - 1, z: z };

        const headBlock = player.dimension.getBlock(headPosition);
        const bodyBlock = player.dimension.getBlock(bodyPosition);
        const feetBlock = player.dimension.getBlock(feetPosition);

        if (headBlock?.isAir && bodyBlock?.isAir && feetBlock?.isAir) {
            break; // Safe position found
        } else {
            safeY += 1; // Move up one block and check again
        }
    }

    return Math.min(safeY, maxHeight - 1);
}

/**
 * Initializes and manages the world border check job.
 * Starts or restarts the world border enforcement job with the current settings.
 */
export function startWorldBorderCheck() {
    if (currentJobId !== null) {
        // Clear any existing job before starting a new one
        system.clearJob(currentJobId);
    }

    currentJobId = system.runJob(worldBorderGenerator(currentJobId));
}

/**
 * Stops world border check
 */
export function stopWorldBorderCheck() {
    system.clearJob(currentJobId);
}
