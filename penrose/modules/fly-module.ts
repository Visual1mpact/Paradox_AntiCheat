import { GameMode, ItemUseBeforeEvent, PlayerLeaveBeforeEvent, system, Vector3, Player, Dimension } from "@minecraft/server";
import { PlayerCache } from "../classes/cache/player-cache";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { FlagManager } from "../classes/logging/flag-manager";

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
/** Threshold in ticks before a flying player triggers anti-fly mitigation */
const HOVER_TIME_THRESHOLD = 6;
/** Horizontal velocity detection threshold */
const HORIZONTAL_VELOCITY_THRESHOLD = 0.35;
/** Vertical velocity detection threshold */
const VERTICAL_VELOCITY_THRESHOLD = 0.2;
/** Max number of players evaluated per job micro-tick budget */
const PLAYERS_PER_YIELD_BATCH = 4;

/** Excluded GameModes compiled outside the loop pass */
const EXCLUDED_GAMEMODES = new Set<GameMode>([GameMode.Creative, GameMode.Spectator]);

/**
 * Distributes an in-game alert notification to active staff players when
 * a player is detected flying or hovering unnaturally.
 *
 * @param {Player} player - The player detected by the check loop.
 */
function alertStaff(player: Player): void {
    const currentTick = system.currentTick;
    const lastAlert = alertCooldowns.get(player.id) ?? 0;

    if (currentTick - lastAlert < ALERT_COOLDOWN_TICKS) return;

    alertCooldowns.set(player.id, currentTick);

    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    FlagManager.logFlag(player, "Fly", "Player was detected flying/hovering.");
    for (const s of staff) {
        if (!s.isValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Fly] §f${player.name} §7was detected flying/hovering.`);
    }
}

/**
 * Event handler triggered prior to a player leaving the server.
 * Cleans up internal memory caches associated with the player.
 *
 * @param {PlayerLeaveBeforeEvent} event - The player leave before event object.
 */
function onPlayerLeaveReset(event: PlayerLeaveBeforeEvent): void {
    const playerId = event.player?.id;
    if (playerId) {
        alertCooldowns.delete(playerId);
        hoverTicks.delete(playerId);
        landingLocations.delete(playerId);
        tridentUsage.delete(playerId);
    }
}

/**
 * Event handler triggered when an item is used by a player.
 * Flags players using tridents to bypass false-positive velocity detections.
 *
 * @param {ItemUseBeforeEvent} event - The item use before event object.
 */
function onItemUseCheck(event: ItemUseBeforeEvent): void {
    const player = event.source;
    if (!player?.isValid) return;

    if (event.itemStack?.typeId === "minecraft:trident") {
        tridentUsage.set(player.id, true);
    }
}

/**
 * Performs a fast 3x3 surrounding ground density scan using integer vector math.
 *
 * @param {Dimension} dimension - Target dimension instance.
 * @param {number} baseX - Floor-aligned X coordinate below the player.
 * @param {number} baseY - Floor-aligned Y coordinate below the player.
 * @param {number} baseZ - Floor-aligned Z coordinate below the player.
 * @returns {boolean} True if the majority (> 4) of surrounding 3x3 foot-level blocks are air.
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
 * Decrements the hover tick counter for a player if currently active.
 *
 * @param {string} playerId - Target player ID.
 */
function decrementHover(playerId: string): void {
    const currentHover = hoverTicks.get(playerId) ?? 0;
    if (currentHover > 0) {
        hoverTicks.set(playerId, currentHover - 1);
    }
}

/**
 * Checks native states and clearance levels to determine if checking should be bypassed.
 *
 * @param {Player} player - Target player.
 * @param {Vector3} location - Player location.
 * @param {Dimension} dimension - Player dimension.
 * @returns {boolean} True if the player should be exempted from flight checks.
 */
function isExemptFromFlyCheck(player: Player, location: Vector3, dimension: Dimension): boolean {
    if (EXCLUDED_GAMEMODES.has(player.getGameMode())) return true;
    if (player.isGliding || player.isClimbing || player.isInWater) return true;

    if (tridentUsage.get(player.id)) {
        tridentUsage.set(player.id, false);
        return true;
    }

    if ((player.getDynamicProperty("securityClearance") as number) === 4) return true;

    const { min: minHeight, max: maxHeight } = dimension.heightRange;
    return location.y < minHeight || location.y >= maxHeight;
}

/**
 * Scans up to 3 blocks beneath the player position to determine if solid ground or liquid exists.
 *
 * @param {Dimension} dimension - Active dimension instance.
 * @param {number} bx - Floor X position.
 * @param {number} by - Floor Y position.
 * @param {number} bz - Floor Z position.
 * @returns {boolean} True if ground or liquid was found within 3 blocks.
 */
function checkBlockGround(dimension: Dimension, bx: number, by: number, bz: number): boolean {
    for (let offset = 1; offset <= 3; offset++) {
        const blk = dimension.getBlock({ x: bx, y: by - offset, z: bz });
        if (blk && (blk.isSolid || blk.isLiquid)) {
            return true;
        }
    }
    return false;
}

/**
 * Evaluates flight violation status and handles mitigation enforcement.
 *
 * @param {Player} player - Active target player entity.
 * @param {Dimension} dimension - Active dimension instance.
 * @param {Vector3} velocity - Player velocity vector.
 * @param {boolean} physicallyGrounded - Calculated grounding state.
 * @param {number} bx - Floor X coordinate.
 * @param {number} by - Floor Y coordinate.
 * @param {number} bz - Floor Z coordinate.
 */
function processFlightViolation(player: Player, dimension: Dimension, velocity: Vector3, physicallyGrounded: boolean, bx: number, by: number, bz: number): void {
    const isFloating = !physicallyGrounded;
    if (!isFloating && !player.isFlying) {
        decrementHover(player.id);
        return;
    }

    const horizontalVelocity = Math.hypot(velocity.x, velocity.z);
    const majorityAreAir = checkIsMajorityAirBelow(dimension, bx, by - 1, bz);

    const isViolatingFlight =
        (!player.isFalling && player.isFlying) || (velocity.y >= -0.05 && majorityAreAir && (Math.abs(velocity.y) >= VERTICAL_VELOCITY_THRESHOLD || horizontalVelocity >= HORIZONTAL_VELOCITY_THRESHOLD) && !player.isJumping && isFloating);

    if (!isViolatingFlight) {
        decrementHover(player.id);
        return;
    }

    const hoverTime = (hoverTicks.get(player.id) ?? 0) + 1;
    hoverTicks.set(player.id, hoverTime);

    if (hoverTime >= HOVER_TIME_THRESHOLD) {
        alertStaff(player);

        const airport = landingLocations.get(player.id);
        if (airport) {
            player.teleport(airport, {
                dimension,
                checkForBlocks: true,
                keepVelocity: false,
            });
        }

        hoverTicks.set(player.id, 0);
    }
}

/**
 * Executes a flight check evaluation for a single player instance.
 *
 * @param {Player} player - Target player entity.
 */
function evaluatePlayerFlight(player: Player): void {
    const transform = PlayerLocationCache.getTransform(player);
    const location = transform?.location ?? player.location;
    const dimension = transform?.dimension ?? player.dimension;

    if (isExemptFromFlyCheck(player, location, dimension)) {
        hoverTicks.delete(player.id);
        return;
    }

    const velocity = player.getVelocity();
    const isNaturalFalling = player.isFalling || velocity.y < -0.08;

    if (player.isOnGround) {
        landingLocations.set(player.id, { x: location.x, y: location.y, z: location.z });
        decrementHover(player.id);
        return;
    }

    const bx = Math.floor(location.x);
    const by = Math.floor(location.y);
    const bz = Math.floor(location.z);

    const blockGroundFound = checkBlockGround(dimension, bx, by, bz);
    const physicallyGrounded = blockGroundFound || isNaturalFalling;

    if (blockGroundFound) {
        landingLocations.set(player.id, { x: location.x, y: location.y, z: location.z });
    }

    processFlightViolation(player, dimension, velocity, physicallyGrounded, bx, by, bz);
}

/**
 * Continuous generator loop that checks players' flying status frame-by-frame.
 * Batch processes multiple players before yielding execution back to the server worker.
 *
 * @yields Control back to the server job scheduler after evaluating execution batches.
 */
function* continuousFlyCheckLoop(): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        if (!isModuleActive) return;

        let processedInBatch = 0;

        for (const player of PlayerCache.getPlayers()) {
            if (!player?.isValid) continue;

            try {
                evaluatePlayerFlight(player);
            } catch {
                // Ignore structural chunk rendering loading bounds errors safely
            }

            processedInBatch++;
            if (processedInBatch >= PLAYERS_PER_YIELD_BATCH) {
                processedInBatch = 0;
                yield;
            }
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
