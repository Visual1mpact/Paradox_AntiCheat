import { GameMode, ItemUseBeforeEvent, PlayerLeaveBeforeEvent, system, Vector3, Player, Dimension } from "@minecraft/server";
import { PlayerCache } from "../classes/cache/player-cache";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";
import { EventCoordinator } from "../classes/event-coordinator";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

/** Flag indicating whether the fly detection module is manually toggled on */
let isModuleActive = false;
/** Flag indicating whether the background generator worker is processing a frame job */
let isJobActive = false;

/** Event listener subscription references for clean cleanup */
let resetSub: ((event: PlayerLeaveBeforeEvent) => void) | undefined;
let itemUseSub: ((event: ItemUseBeforeEvent) => void) | undefined;

/** Tracks the last tick a fly alert was sent per player to prevent staff message spam */
const alertCooldowns = new Map<string, number>();
/** In-memory tracking of hover ticks per player to avoid unnecessary DynamicProperty writes */
const hoverTicks = new Map<string, number>();
/** In-memory safe landing locations prior to flight detection */
const landingLocations = new Map<string, Vector3>();
/** In-memory tracking of trident usage state per player */
const tridentUsage = new Map<string, boolean>();

/** Cooldown duration in ticks (10 seconds at 20 ticks/sec) between staff alert notifications */
const ALERT_COOLDOWN_TICKS = 200;
/** Threshold in ticks before a flying player triggers anti-fly mitigation (Increased to absorb step-down/bhop micro-hangs) */
const HOVER_TIME_THRESHOLD = 6;
/** Horizontal velocity detection threshold */
const HORIZONTAL_VELOCITY_THRESHOLD = 0.35;
/** Vertical velocity detection threshold */
const VERTICAL_VELOCITY_THRESHOLD = 0.2;

/** Excluded GameModes compiled outside the loop pass */
const EXCLUDED_GAMEMODES = new Set<GameMode>([GameMode.Creative, GameMode.Spectator]);

/**
 * Distributes an in-game alert notification to active staff players when
 * a player is detected flying or hovering unnaturally.
 *
 * @param player - The player detected by the check loop.
 */
function alertStaff(player: Player): void {
    const currentTick = system.currentTick;
    const lastAlert = alertCooldowns.get(player.id) ?? 0;

    if (currentTick - lastAlert < ALERT_COOLDOWN_TICKS) return;

    alertCooldowns.set(player.id, currentTick);

    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (!s.isValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Fly] §f${player.name} §7was detected flying/hovering.`);
    }
}

/**
 * Event handler triggered prior to a player leaving the server.
 * Cleans up internal memory caches associated with the player.
 *
 * @param event - The player leave before event object.
 */
async function onPlayerLeaveReset(event: PlayerLeaveBeforeEvent): Promise<void> {
    const player = event.player;
    if (player?.id) {
        alertCooldowns.delete(player.id);
        hoverTicks.delete(player.id);
        landingLocations.delete(player.id);
        tridentUsage.delete(player.id);
    }
}

/**
 * Event handler triggered when an item is used by a player.
 * Flags players using tridents to bypass false-positive velocity detections.
 *
 * @param event - The item use before event object.
 */
async function onItemUseCheck(event: ItemUseBeforeEvent): Promise<void> {
    const player = event.source;
    if (!player?.isValid) return;

    const item = event.itemStack?.typeId;
    if (item === "minecraft:trident") {
        tridentUsage.set(player.id, true);
    }
}

/**
 * Performs a fast 3x3 surrounding ground density scan using integer vector math
 * instead of native directional chaining (e.g. block.north().east()).
 *
 * @param dimension - Target dimension instance.
 * @param baseX - Floor-aligned X coordinate below the player.
 * @param baseY - Floor-aligned Y coordinate below the player.
 * @param baseZ - Floor-aligned Z coordinate below the player.
 * @returns True if the majority (> 4) of surrounding 3x3 foot-level blocks are air.
 */
function checkIsMajorityAirBelow(dimension: Dimension, baseX: number, baseY: number, baseZ: number): boolean {
    let airCount = 0;

    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            const block = dimension.getBlock({ x: baseX + dx, y: baseY, z: baseZ + dz });
            if (block?.isAir) {
                airCount++;
                if (airCount > 4) return true;
            }
        }
    }

    return airCount > 4;
}

/**
 * Continuous generator loop that checks players' flying status frame-by-frame.
 *
 * @yields Control back to the server job scheduler per player evaluated.
 */
function* continuousFlyCheckLoop(): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        if (!isModuleActive) return;

        for (const player of PlayerCache.getPlayers()) {
            if (!player?.isValid) continue;

            try {
                if (EXCLUDED_GAMEMODES.has(player.getGameMode())) {
                    hoverTicks.delete(player.id);
                    continue;
                }

                if (player.isGliding || player.isClimbing || player.isInWater) {
                    hoverTicks.delete(player.id);
                    continue;
                }

                if (tridentUsage.get(player.id)) {
                    tridentUsage.set(player.id, false);
                    hoverTicks.delete(player.id);
                    continue;
                }

                if ((player.getDynamicProperty("securityClearance") as number) === 4) {
                    hoverTicks.delete(player.id);
                    continue;
                }

                const transform = PlayerLocationCache.getTransform(player);
                const location = transform?.location ?? player.location;
                const dimension = transform?.dimension ?? player.dimension;

                const { min: minHeight, max: maxHeight } = dimension.heightRange;
                if (location.y < minHeight || location.y >= maxHeight) {
                    hoverTicks.delete(player.id);
                    continue;
                }

                const bx = Math.floor(location.x);
                const by = Math.floor(location.y);
                const bz = Math.floor(location.z);

                const velocity = player.getVelocity();

                // --- EXPANDED GROUND BOUNDING BOX SCAN ---
                // Scan down 3 blocks (y-1, y-2, y-3) to accommodate step-downs, stairs, and b-hop landing arcs
                let blockGroundFound = false;
                for (let offset = 1; offset <= 3; offset++) {
                    const blk = dimension.getBlock({ x: bx, y: by - offset, z: bz });
                    if (blk && (blk.isSolid || blk.isLiquid)) {
                        blockGroundFound = true;
                        break;
                    }
                }

                // Legitimate downward step or gravity arc protection
                const isNaturalFalling = player.isFalling || velocity.y < -0.08;
                const physicallyGrounded = blockGroundFound || isNaturalFalling;

                if (player.isOnGround || blockGroundFound) {
                    landingLocations.set(player.id, { x: location.x, y: location.y, z: location.z });
                }

                // Early exit for legitimately grounded or falling players
                const isFloating = !player.isOnGround && !physicallyGrounded;
                if (!isFloating && !player.isFlying) {
                    // Decay hover ticks gracefully instead of instantly zeroing to catch multi-tick micro-flights
                    const currentHover = hoverTicks.get(player.id) ?? 0;
                    if (currentHover > 0) hoverTicks.set(player.id, currentHover - 1);
                    continue;
                }

                const majorityAreAir = checkIsMajorityAirBelow(dimension, bx, by - 1, bz);
                const horizontalVelocity = Math.hypot(velocity.x, velocity.z);

                // Ignore violations during downward acceleration or active jump arcs
                const isViolatingFlight =
                    (!player.isFalling && player.isFlying) || (velocity.y >= -0.05 && majorityAreAir && (Math.abs(velocity.y) >= VERTICAL_VELOCITY_THRESHOLD || horizontalVelocity >= HORIZONTAL_VELOCITY_THRESHOLD) && !player.isJumping && isFloating);

                if (isViolatingFlight) {
                    let hoverTime = (hoverTicks.get(player.id) ?? 0) + 1;
                    hoverTicks.set(player.id, hoverTime);

                    if (hoverTime >= HOVER_TIME_THRESHOLD) {
                        alertStaff(player);

                        const airport = landingLocations.get(player.id);
                        if (airport) {
                            player.teleport(airport, {
                                dimension: dimension,
                                checkForBlocks: true,
                                keepVelocity: false,
                            });
                        }

                        hoverTicks.set(player.id, 0);
                    }
                } else {
                    const currentHover = hoverTicks.get(player.id) ?? 0;
                    if (currentHover > 0) hoverTicks.set(player.id, currentHover - 1);
                }
            } catch {
                // Ignore structural chunk rendering loading bounds errors safely
            }

            yield;
        }
    } finally {
        isJobActive = false;

        if (isModuleActive) {
            system.run(() => {
                system.runJob(continuousFlyCheckLoop());
            });
        }
    }
}

/**
 * Starts the fly check process and coordinates event listeners.
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

    alertCooldowns.clear();
    hoverTicks.clear();
    landingLocations.clear();
    tridentUsage.clear();
}
