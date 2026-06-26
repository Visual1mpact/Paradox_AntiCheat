import { GameMode, system, Vector3 } from "@minecraft/server";
import { PlayerCache } from "../classes/player-cache";
import { EventCoordinator } from "../classes/event-coordinator";

/** Flag indicating whether the module is manually toggled on */
let isModuleActive = false;
/** Flag indicating whether the background generator worker is processing a frame */
let isJobActive = false;

let resetSub: ((event: any) => void) | undefined;
let itemUseSub: ((event: any) => void) | undefined;

function onPlayerLeaveReset(event: any) {
    const player = event.player;
    const isValid = player && (typeof player.isValid === "function" ? player.isValid() : (player as any).isValid);
    if (isValid) {
        player.setDynamicProperty("tridentUsed", false);
    }
}

function onItemUseCheck(event: any) {
    const player = event.source;
    const item = event.itemStack?.typeId;

    if (item === "minecraft:trident") {
        player.setDynamicProperty("tridentUsed", true);
    }
}

/**
 * Continuous generator loop that checks players' flying status frame-by-frame.
 */
function* continuousFlyCheckLoop(): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        if (!isModuleActive) return;

        // Define gamemodes to exclude
        const excludedGMs = new Set([GameMode.Creative, GameMode.Spectator]);

        // Use PlayerCache for zero-allocation iteration
        for (const player of PlayerCache.getPlayers()) {
            const isValid = player.isValid;
            if (!isValid) continue;

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
                if (!blockAtLocation) continue;

                const blockBelow = blockAtLocation.below();
                if (!blockBelow) continue;

                // Verify ground state to prevent spoofing.
                const checkBlockDeep = player.dimension.getBlock({ x: location.x, y: location.y - 0.7, z: location.z });
                const physicallyGrounded = blockBelow.isSolid || blockBelow.isLiquid || (checkBlockDeep?.isSolid ?? false);

                if (player.isOnGround && physicallyGrounded) {
                    player.setDynamicProperty("airportLanding", player.location);
                }

                const blockN = blockBelow.north();
                const blockS = blockBelow.south();
                const blockE = blockBelow.east();
                const blockW = blockBelow.west();

                const surroundingBlocksBelow = [blockBelow, blockN, blockN?.east(), blockE, blockS?.east(), blockS, blockS?.west(), blockW, blockN?.west()];

                const airBlockCountBelow = surroundingBlocksBelow.filter((block) => block?.isAir).length;
                const majorityAreAir = airBlockCountBelow > surroundingBlocksBelow.length / 2;

                const velocity = player.getVelocity();
                const horizontalVelocity = Math.sqrt(velocity.x ** 2 + velocity.z ** 2); // Calculate horizontal speed
                const verticalVelocityThreshold = 0.15;
                const horizontalVelocityThreshold = 0.15;
                const hoverTimeThreshold = 2;
                let hoverTime = (player.getDynamicProperty("hoverTime") as number) ?? 0;

                // Anti-Fly Detection Matrix:
                const isFloating = !player.isOnGround || !physicallyGrounded;
                if ((!player.isFalling && player.isFlying) || (velocity.y >= -0.1 && majorityAreAir && (Math.abs(velocity.y) >= verticalVelocityThreshold || horizontalVelocity >= horizontalVelocityThreshold) && !player.isJumping && isFloating)) {
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
                // Ignore structural chunk rendering loading bounds errors safely
            }

            // Yield control back to engine processing after evaluating each single player
            yield;
        }
    } finally {
        isJobActive = false;

        // Loop the task dynamically on the next available engine frame tick
        if (isModuleActive) {
            system.run(() => {
                system.runJob(continuousFlyCheckLoop());
            });
        }
    }
}

/**
 * Starts the fly check process and coordinates listeners.
 */
export function startFlyCheck(): void {
    if (isModuleActive) return;
    isModuleActive = true;

    if (!itemUseSub) {
        itemUseSub = onItemUseCheck;
        EventCoordinator.subscribeBefore("itemUse", itemUseSub);
    }
    if (!resetSub) {
        resetSub = onPlayerLeaveReset;
        EventCoordinator.subscribeBefore("playerLeave", resetSub);
    }

    if (!isJobActive) {
        system.runJob(continuousFlyCheckLoop());
    }
}

/**
 * Stops the fly check process and safely detaches active listeners.
 */
export function stopFlyCheck(): void {
    isModuleActive = false;

    if (itemUseSub) {
        EventCoordinator.unsubscribeBefore("itemUse", itemUseSub);
        itemUseSub = undefined;
    }
    if (resetSub) {
        EventCoordinator.unsubscribeBefore("playerLeave", resetSub);
        resetSub = undefined;
    }
}
