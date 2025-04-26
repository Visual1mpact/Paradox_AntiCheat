import { Player, world, system, Dimension } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";

let worldBorderJobId: number | null = null;
let worldBorderRunId: number | null = null;

interface WorldBorderSettings {
    overworld: number;
    nether: number;
    end: number;
}

/**
 * Generator function that checks and enforces world borders on players.
 * @yields {void} - Yields after processing each player.
 */
function* worldBorderGenerator(): Generator<void, void, unknown> {
    const modeKeys = {
        worldBorderCheck: "worldBorderCheck_b",
        worldBorderSettings: "worldBorder_settings",
    };

    const worldBorderEnabled = paradoxModulesDB.get<boolean>(modeKeys.worldBorderCheck) ?? false;
    const worldBorderSettings = paradoxModulesDB.get<WorldBorderSettings>(modeKeys.worldBorderSettings) ?? {
        overworld: 0,
        nether: 0,
        end: 0,
    };

    if (!worldBorderEnabled) {
        return;
    }

    const players = world.getPlayers();
    const spawnLocation = world.getDefaultSpawnLocation();
    const checkAndTeleportPlayer = createWorldBorderChecker(spawnLocation);

    for (const player of players) {
        if (player.isValid && (player.getDynamicProperty("securityClearance") as number) === 4) {
            continue;
        }

        const { x, y, z } = player.location;

        if (player.dimension.id === "minecraft:overworld" && worldBorderSettings.overworld > 0) {
            checkAndTeleportPlayer(player, x, y, z, worldBorderSettings.overworld, "Overworld");
        } else if (player.dimension.id === "minecraft:nether" && worldBorderSettings.nether > 0) {
            checkAndTeleportPlayer(player, x, y, z, worldBorderSettings.nether, "Nether");
        } else if (player.dimension.id === "minecraft:the_end" && worldBorderSettings.end > 0) {
            checkAndTeleportPlayer(player, x, y, z, worldBorderSettings.end, "End");
        }
        yield;
    }
}

/**
 * Creates a world border checker function based on a specified spawn location.
 *
 * The returned function checks if a player exceeds the border size relative
 * to the spawn location, and teleports them back inside the boundary if necessary.
 *
 * @param {{ x: number; y: number; z: number }} spawnLocation - The center point used as the border reference.
 * @returns {(player: Player, x: number, y: number, z: number, borderSize: number, dimension: string) => void}
 * A function that checks a player's position and enforces the border rules.
 */
function createWorldBorderChecker(spawnLocation: { x: number; y: number; z: number }): (player: Player, x: number, y: number, z: number, borderSize: number, dimension: string) => void {
    return function checkAndTeleportPlayer(player: Player, x: number, y: number, z: number, borderSize: number, dimension: string) {
        const borderOffset = borderSize - 3;

        const dx = x - spawnLocation.x;
        const dz = z - spawnLocation.z;

        if (dx > borderSize || dx < -borderSize || dz > borderSize || dz < -borderSize) {
            const targetX = dx < -borderSize ? spawnLocation.x - borderOffset + 6 : dx >= borderSize ? spawnLocation.x + borderOffset - 6 : x;

            const targetZ = dz < -borderSize ? spawnLocation.z - borderOffset + 6 : dz >= borderSize ? spawnLocation.z + borderOffset - 6 : z;

            const safeY = findSafeY(player, targetX, y, targetZ);

            player.sendMessage(`§2[§7Paradox§2]§o§7 You have reached the world border in the ${dimension}.`);
            player.teleport({ x: targetX, y: safeY, z: targetZ }, { dimension: player.dimension });
        }
    };
}

/**
 * Gets valid height range for a dimension.
 * @param {Dimension} dimension - The dimension to check.
 * @returns {{ min: number; max: number }} - The height range.
 */
function getDimensionHeightRange(dimension: Dimension): { min: number; max: number } {
    try {
        return dimension.heightRange;
    } catch (error) {
        console.error(`Error accessing height range: ${error}`);
        return { min: -64, max: 320 };
    }
}

/**
 * Finds a safe Y-coordinate to teleport the player to.
 * @param {Player} player - The player to teleport.
 * @param {number} x - Target x-coordinate.
 * @param {number} y - Starting y-coordinate.
 * @param {number} z - Target z-coordinate.
 * @returns {number} - A safe Y-coordinate.
 */
function findSafeY(player: Player, x: number, y: number, z: number): number {
    const { min: minHeight, max: maxHeight } = getDimensionHeightRange(player.dimension);
    let safeY = Math.max(minHeight, Math.min(y, maxHeight - 1));

    while (safeY >= minHeight && safeY < maxHeight) {
        const head = player.dimension.getBlock({ x, y: safeY + 1, z });
        const body = player.dimension.getBlock({ x, y: safeY, z });
        const feet = player.dimension.getBlock({ x, y: safeY - 1, z });

        if (head?.isAir && body?.isAir && feet?.isAir) {
            break;
        } else {
            safeY += 1;
        }
    }
    return Math.min(safeY, maxHeight - 1);
}

/**
 * Executes the world border generator as a background job.
 * @returns {Promise<void>} Resolves when the generator completes.
 */
async function executeWorldBorderCheck(): Promise<void> {
    if (worldBorderJobId !== null) {
        system.clearJob(worldBorderJobId);
    }

    const jobPromise = new Promise<void>((resolve) => {
        function* jobRunner() {
            yield* worldBorderGenerator();
            resolve();
        }
        worldBorderJobId = system.runJob(jobRunner());
    });

    await jobPromise;
}

/**
 * Starts world border enforcement at regular intervals.
 */
export async function startWorldBorderCheck(): Promise<void> {
    if (worldBorderRunId !== null) {
        system.clearRun(worldBorderRunId);
    }

    let isRunning = false;
    let runIdBackup: number;

    worldBorderRunId = system.runInterval(async () => {
        if (isRunning) {
            system.clearRun(worldBorderRunId);
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
 * Stops the world border enforcement system and cleans up jobs and intervals.
 */
export function stopWorldBorderCheck(): void {
    if (worldBorderJobId !== null) {
        system.clearJob(worldBorderJobId);
    }
    if (worldBorderRunId !== null) {
        system.clearRun(worldBorderRunId);
    }
}
