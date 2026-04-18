import { GameMode, system, Vector3 } from "@minecraft/server";
import { PlayerCache } from "../classes/player-cache";
import { EventCoordinator } from "../classes/event-coordinator";

let currentJobId: number | null = null;
let currentRunId: number | null = null;

function onPlayerLeaveReset(event: any) {
    const player = event.player;
    if (player.isValid) {
        player.setDynamicProperty("tridentUsed", false);
    }
}
let resetSub: any;

function onItemUseCheck(event: any) {
    const player = event.source;
    const item = event.itemStack.typeId;

    if (item === "minecraft:trident") {
        player.setDynamicProperty("tridentUsed", true);
    }
}
let itemUseSub: any;

/**
 * Generator function to check players' flying status and teleport if necessary.
 * @generator
 * @yields {void} Pauses the generator after processing each player.
 */
function* flyCheckGenerator(): Generator<void, void, unknown> {
    // Define gamemodes to exclude
    const excludedGMs = new Set([GameMode.Creative, GameMode.Spectator]);

    // Use PlayerCache for zero-allocation iteration
    for (const player of PlayerCache.getPlayers()) {
        if (player.isValid) {
            try {
                // Skip excluded gamemodes
                if (excludedGMs.has(player.getGameMode())) continue;

                const tridentUsed = player.getDynamicProperty("tridentUsed") as boolean;
                if (tridentUsed) {
                    player.setDynamicProperty("tridentUsed", false);
                    continue;
                }

                if (player.isGliding || player.isClimbing || player.isInWater) {
                    continue;
                }

                if ((player.getDynamicProperty("securityClearance") as number) === 4) {
                    continue;
                }

                const location = player.location;
                const { min: minHeight, max: maxHeight } = player.dimension.heightRange;

                // Validate player location within height range
                if (location.y < minHeight || location.y >= maxHeight) {
                    continue;
                }

                const blockAtLocation = player.dimension.getBlock(location);
                if (!blockAtLocation) {
                    continue;
                }

                if (player.isOnGround) {
                    player.setDynamicProperty("airportLanding", player.location);
                }

                const blockBelow = blockAtLocation.below(); // Block directly beneath the player
                if (!blockBelow) {
                    // if there's no block below, skip this player
                    continue;
                }
                const surroundingBlocksBelow = [blockBelow, blockBelow.north(), blockBelow.north()?.east(), blockBelow.east(), blockBelow.south()?.east(), blockBelow.south(), blockBelow.south()?.west(), blockBelow.west(), blockBelow.north()?.west()];

                const airBlockCountBelow = surroundingBlocksBelow.filter((block) => block?.isAir).length;
                const majorityAreAir = airBlockCountBelow > surroundingBlocksBelow.length / 2;

                const velocity = player.getVelocity();
                const horizontalVelocity = Math.sqrt(velocity.x ** 2 + velocity.z ** 2); // Calculate horizontal speed
                const verticalVelocityThreshold = 0.15;
                const horizontalVelocityThreshold = 0.15;
                const hoverTimeThreshold = 2;
                let hoverTime = (player.getDynamicProperty("hoverTime") as number) ?? 0;

                if ((!player.isFalling && player.isFlying) || (majorityAreAir && (Math.abs(velocity.y) >= verticalVelocityThreshold || horizontalVelocity >= horizontalVelocityThreshold) && !player.isJumping && !player.isOnGround)) {
                    hoverTime += 1;
                    player.setDynamicProperty("hoverTime", hoverTime);

                    if (hoverTime >= hoverTimeThreshold) {
                        const airport = player.getDynamicProperty("airportLanding") as Vector3;
                        if (airport) {
                            player.teleport(airport, {
                                dimension: player.dimension,
                                rotation: { x: airport.x, y: airport.y },
                                facingLocation: { x: airport.x, y: airport.y, z: airport.z },
                                checkForBlocks: true,
                                keepVelocity: false,
                            });
                        }

                        player.setDynamicProperty("hoverTime", 0);
                    }
                } else {
                    player.setDynamicProperty("hoverTime", 0);
                }
            } catch (e) {
                // Ignore dimension loading errors
            }
        }
        yield;
    }
}

/**
 * Executes the fly check generator function with a promise-based approach.
 * @returns {Promise<void>} Resolves once the fly check job is finished.
 */
async function executeFlyCheck(): Promise<void> {
    if (currentJobId !== null) {
        system.clearJob(currentJobId);
    }

    const jobPromise = new Promise<void>((resolve) => {
        function* jobRunner() {
            try {
                yield* flyCheckGenerator();
            } finally {
                resolve();
            }
        }
        currentJobId = system.runJob(jobRunner());
    });

    await jobPromise;
}

/**
 * Starts the fly check process and schedules it to run at regular intervals.
 */
export async function startFlyCheck(): Promise<void> {
    if (currentRunId !== null) return;

    let isRunning = false;
    let runIdBackup: number | null = null;

    if (!itemUseSub) {
        itemUseSub = onItemUseCheck;
        EventCoordinator.subscribeBefore("itemUse", itemUseSub);
    }
    if (!resetSub) {
        resetSub = onPlayerLeaveReset;
        EventCoordinator.subscribeBefore("playerLeave", resetSub);
    }

    currentRunId = system.runInterval(async () => {
        if (isRunning) {
            // Restore the backup runId if an overlap is detected
            system.clearRun(currentRunId as number);
            currentRunId = runIdBackup;
            return; // Skip this iteration if the previous one is still running
        }

        runIdBackup = currentRunId!;
        isRunning = true;

        await executeFlyCheck();
        isRunning = false;
    }, 20); // Check every second (20 ticks)
}

/**
 * Stops the fly check process.
 */
export function stopFlyCheck(): void {
    if (currentJobId !== null) {
        system.clearJob(currentJobId);
    }
    if (currentRunId !== null) {
        system.clearRun(currentRunId);
        currentRunId = null;
    }
    if (itemUseSub) {
        EventCoordinator.unsubscribeBefore("itemUse", onItemUseCheck);
        itemUseSub = undefined;
    }
    if (resetSub) {
        EventCoordinator.unsubscribeBefore("playerLeave", onPlayerLeaveReset);
        resetSub = undefined;
    }
}
