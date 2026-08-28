import { system, Player, GameMode, AABB, EntityHurtAfterEvent, PlayerLeaveBeforeEvent, PlayerDimensionChangeAfterEvent, Dimension } from "@minecraft/server";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { PlayerCache } from "../classes/cache/player-cache";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { FlagManager } from "../classes/logging/flag-manager";

/** Number of detections required before action is taken. */
const PHASE_FLAGS_REQUIRED = 5;

/** Collision tolerance in blocks to prevent false positives from minor clipping. */
const COLLISION_TOLERANCE = 0.15;

/**
 * Maximum distance (in blocks) evaluated per tick.
 * Movement beyond this (e.g., teleports) skips collision checks to prevent Watchdog hangs.
 */
const MAX_CHECK_DISTANCE = 10;

interface Vector3 {
    x: number;
    y: number;
    z: number;
}

interface Bounds {
    min: Vector3;
    max: Vector3;
}

interface PlayerMovementData {
    lastPos: Vector3;
    dimensionId: string;
    phaseFlags: number;
}

/** Tracks players' movement history and dimension context. */
const playerData = new Map<string, PlayerMovementData>();

/** Tracks recent damage to allow knockback exemptions. */
const recentDamage = new Map<string, number>();

/** Flag indicating whether the module is manually toggled on */
let isModuleActive = false;
/** Flag indicating whether the background generator worker is processing a frame */
let isJobActive = false;

/** Active event subscription references */
let hurtSubscription: ((ev: EntityHurtAfterEvent) => void) | undefined;
let leaveSubscription: ((ev: PlayerLeaveBeforeEvent) => void) | undefined;
let dimensionChangeSubscription: ((ev: PlayerDimensionChangeAfterEvent) => void) | undefined;

/**
 * Determines if a block position should allow movement through it.
 * Safely handles unloaded chunks or out-of-bounds coordinates to prevent engine freezes.
 *
 * @param {Dimension} dim - Dimension instance
 * @param {Vector3} pos - Block position to evaluate
 * @returns {boolean} True if block should be ignored for collision checks
 */
function isPassThrough(dim: Dimension, pos: Vector3): boolean {
    try {
        const block = dim.getBlock({
            x: Math.floor(pos.x),
            y: Math.floor(pos.y),
            z: Math.floor(pos.z),
        });

        if (!block || !block.isValid) return true;
        if (block.isAir || block.isLiquid || !block.isSolid) return true;

        try {
            if (block.permutation.getState("open_bit") === true) return true;
        } catch {
            // Ignore block permutation lookup errors on non-standard block types
        }

        return false;
    } catch {
        // Treat unloaded/inaccessible chunks as pass-through to prevent watchdog crashes
        return true;
    }
}

/** Returns the current timestamp in seconds. */
function now(): number {
    return Date.now() / 1000;
}

/** Calculates Euclidean distance between two positions. */
function distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Sends a NoClip alert to Level 4 security staff. */
function alertStaff(offender: Player, dist: number): void {
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    FlagManager.logFlag(offender, "NoClip", `Player tried to phase ${dist.toFixed(1)} blocks.`);
    for (const s of staff) {
        if (!s?.isValid || s.id === offender.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[NoClip] §f${offender.name} §7tried to phase §e${dist.toFixed(1)} blocks§7!`);
    }
}

/** Converts a Bedrock AABB (center/extent) into min/max bounds. */
function getBounds(box: AABB): Bounds {
    return {
        min: {
            x: box.center.x - box.extent.x,
            y: box.center.y - box.extent.y,
            z: box.center.z - box.extent.z,
        },
        max: {
            x: box.center.x + box.extent.x,
            y: box.center.y + box.extent.y,
            z: box.center.z + box.extent.z,
        },
    };
}

/**
 * Validates swept corner points against pass-through logic.
 * @param {Dimension} dim - Dimension instance.
 * @param {Bounds} grid - Bounds containing floor/ceil coordinates.
 * @returns {boolean} True if any corner is solid.
 */
function checkSweptCorners(dim: Dimension, grid: Bounds): boolean {
    const corners: Vector3[] = [
        { x: grid.min.x + COLLISION_TOLERANCE, y: grid.min.y + COLLISION_TOLERANCE, z: grid.min.z + COLLISION_TOLERANCE },
        { x: grid.min.x + COLLISION_TOLERANCE, y: grid.min.y + COLLISION_TOLERANCE, z: grid.max.z + 1 - COLLISION_TOLERANCE },
        { x: grid.min.x + COLLISION_TOLERANCE, y: grid.max.y + 1 - COLLISION_TOLERANCE, z: grid.min.z + COLLISION_TOLERANCE },
        { x: grid.min.x + COLLISION_TOLERANCE, y: grid.max.y + 1 - COLLISION_TOLERANCE, z: grid.max.z + 1 - COLLISION_TOLERANCE },
        { x: grid.max.x + 1 - COLLISION_TOLERANCE, y: grid.min.y + COLLISION_TOLERANCE, z: grid.min.z + COLLISION_TOLERANCE },
        { x: grid.max.x + 1 - COLLISION_TOLERANCE, y: grid.min.y + COLLISION_TOLERANCE, z: grid.max.z + 1 - COLLISION_TOLERANCE },
        { x: grid.max.x + 1 - COLLISION_TOLERANCE, y: grid.max.y + 1 - COLLISION_TOLERANCE, z: grid.min.z + COLLISION_TOLERANCE },
        { x: grid.max.x + 1 - COLLISION_TOLERANCE, y: grid.max.y + 1 - COLLISION_TOLERANCE, z: grid.max.z + 1 - COLLISION_TOLERANCE },
    ];

    for (const corner of corners) {
        if (!isPassThrough(dim, corner)) return true;
    }
    return false;
}

/**
 * Evaluates internal swept block overlaps.
 * @param {Dimension} dim - Dimension instance.
 * @param {Bounds} grid - Grid bounds.
 * @param {Bounds} sweep - Swept movement bounds.
 * @returns {boolean} True if internal collision detected.
 */
function checkSweptInteriors(dim: Dimension, grid: Bounds, sweep: Bounds): boolean {
    for (let x = grid.min.x; x <= grid.max.x; x++) {
        for (let y = grid.min.y; y <= grid.max.y; y++) {
            for (let z = grid.min.z; z <= grid.max.z; z++) {
                const isCorner = (x === grid.min.x || x === grid.max.x) && (y === grid.min.y || y === grid.max.y) && (z === grid.min.z || z === grid.max.z);
                if (isCorner) continue;

                if (!isPassThrough(dim, { x, y, z })) {
                    const blockMin = { x: x + COLLISION_TOLERANCE, y: y + COLLISION_TOLERANCE, z: z + COLLISION_TOLERANCE };
                    const blockMax = { x: x + 1 - COLLISION_TOLERANCE, y: y + 1 - COLLISION_TOLERANCE, z: z + 1 - COLLISION_TOLERANCE };

                    if (sweep.min.x <= blockMax.x && sweep.max.x >= blockMin.x && sweep.min.y <= blockMax.y && sweep.max.y >= blockMin.y && sweep.min.z <= blockMax.z && sweep.max.z >= blockMin.z) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

/**
 * Performs ray-march step checking along movement vector.
 * @param {Dimension} dim - Dimension instance.
 * @param {Vector3} start - Start position.
 * @param {Vector3} end - Target end position.
 * @returns {boolean} True if ray collision occurs.
 */
function checkRayPath(dim: Dimension, start: Vector3, end: Vector3): boolean {
    const steps = 4;
    let px = start.x;
    let py = start.y;
    let pz = start.z;
    const dx = (end.x - start.x) / steps;
    const dy = (end.y - start.y) / steps;
    const dz = (end.z - start.z) / steps;

    for (let i = 0; i < steps; i++) {
        px += dx;
        py += dy;
        pz += dz;

        const bx = Math.floor(px);
        const by = Math.floor(py);
        const bz = Math.floor(pz);

        if (!isPassThrough(dim, { x: bx, y: by, z: bz })) {
            const blockMin = { x: bx + COLLISION_TOLERANCE, y: by + COLLISION_TOLERANCE, z: bz + COLLISION_TOLERANCE };
            const blockMax = { x: bx + 1 - COLLISION_TOLERANCE, y: by + 1 - COLLISION_TOLERANCE, z: bz + 1 - COLLISION_TOLERANCE };

            if (px >= blockMin.x && px <= blockMax.x && py >= blockMin.y && py <= blockMax.y && pz >= blockMin.z && pz <= blockMax.z) return true;
        }
    }
    return false;
}

/** Performs a tolerance-aware swept AABB collision check for a player. */
function sweptAABBWithTolerance(player: Player, dim: Dimension, start: Vector3, end: Vector3): boolean {
    const base = getBounds(player.getAABB());

    const movement = {
        x: end.x - start.x,
        y: end.y - start.y,
        z: end.z - start.z,
    };

    const sweep: Bounds = {
        min: {
            x: Math.min(base.min.x, base.min.x + movement.x),
            y: Math.min(base.min.y, base.min.y + movement.y),
            z: Math.min(base.min.z, base.min.z + movement.z),
        },
        max: {
            x: Math.max(base.max.x, base.max.x + movement.x),
            y: Math.max(base.max.y, base.max.y + movement.y),
            z: Math.max(base.max.z, base.max.z + movement.z),
        },
    };

    const grid: Bounds = {
        min: { x: Math.floor(sweep.min.x), y: Math.floor(sweep.min.y), z: Math.floor(sweep.min.z) },
        max: { x: Math.floor(sweep.max.x), y: Math.floor(sweep.max.y), z: Math.floor(sweep.max.z) },
    };

    if (checkSweptCorners(dim, grid)) return true;
    if (checkSweptInteriors(dim, grid, sweep)) return true;
    return checkRayPath(dim, start, end);
}

/**
 * Handles flag increments, alerting, and rollback actions upon detection.
 * @param {Player} player - Target player.
 * @param {PlayerMovementData} data - Movement data context.
 * @param {Vector3} prev - Previous location position.
 * @param {Dimension} dimension - Current dimension instance.
 * @param {number} movedDist - Total distance moved.
 */
function handlePhaseDetection(player: Player, data: PlayerMovementData, prev: Vector3, dimension: Dimension, movedDist: number): void {
    data.phaseFlags++;

    if (data.phaseFlags >= PHASE_FLAGS_REQUIRED) {
        player.sendMessage("§o§c[Paradox] You have been detected phasing through blocks!");
        alertStaff(player, movedDist);
        player.teleport(prev, { dimension });
        data.phaseFlags = 0;
    }
}

/** Performs NoClip detection for a player. */
function checkPlayer(player: Player): void {
    const gameMode = player.getGameMode();
    if (gameMode === GameMode.Creative || gameMode === GameMode.Spectator) return;

    const uuid = player.id;
    if (now() - (recentDamage.get(uuid) ?? 0) < 2) return;

    const transform = PlayerLocationCache.getTransform(player);
    const loc = transform?.location ?? player.location;
    const dimension = transform?.dimension ?? player.dimension;
    const currentDimId = dimension.id;

    let data = playerData.get(uuid);
    if (!data) {
        playerData.set(uuid, {
            lastPos: { x: loc.x, y: loc.y, z: loc.z },
            dimensionId: currentDimId,
            phaseFlags: 0,
        });
        return;
    }

    const prev = data.lastPos;
    const cur = { x: loc.x, y: loc.y, z: loc.z };
    const movedDist = distance(prev, cur);

    if (data.dimensionId !== currentDimId || movedDist > MAX_CHECK_DISTANCE) {
        data.lastPos = cur;
        data.dimensionId = currentDimId;
        data.phaseFlags = 0;
        return;
    }

    data.lastPos = cur;

    if (movedDist < 0.75) {
        data.phaseFlags = Math.max(0, data.phaseFlags - 1);
        return;
    }

    const detected = sweptAABBWithTolerance(player, dimension, prev, cur);

    if (detected) {
        handlePhaseDetection(player, data, prev, dimension, movedDist);
    } else {
        data.phaseFlags = Math.max(0, data.phaseFlags - 1);
    }
}

/** Continuous generator loop that iterates over players to perform NoClip checks. */
function* continuousNoClipLoop(): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        if (!isModuleActive) return;

        const players = PlayerCache.getPlayers();

        for (const player of players) {
            if (!player?.isValid) continue;

            try {
                checkPlayer(player);
            } catch {
                // Ignore transient errors safely
            }

            yield;
        }
    } finally {
        isJobActive = false;

        if (isModuleActive) {
            system.run(() => {
                system.runJob(continuousNoClipLoop());
            });
        }
    }
}

/** Tracks player damage for knockback exemptions. */
function trackDamage(ev: EntityHurtAfterEvent): void {
    if (ev.hurtEntity instanceof Player) recentDamage.set(ev.hurtEntity.id, now());
}

/** Cleans up player tracking when they leave. */
function cleanupPlayerData(ev: PlayerLeaveBeforeEvent): void {
    const player = ev.player;
    playerData.delete(player.id);
    recentDamage.delete(player.id);
}

/** Updates tracking state upon explicit dimension change events. */
function handleDimensionChange(ev: PlayerDimensionChangeAfterEvent): void {
    const player = ev.player;
    if (!player?.isValid) return;

    playerData.set(player.id, {
        lastPos: { x: ev.toLocation.x, y: ev.toLocation.y, z: ev.toLocation.z },
        dimensionId: ev.toDimension.id,
        phaseFlags: 0,
    });
}

/** Starts the NoClip detection module. */
export function startNoClip(): void {
    if (isModuleActive) return;
    isModuleActive = true;

    if (!hurtSubscription) {
        hurtSubscription = trackDamage;
        EventCoordinator.subscribeAfter("entityHurt", hurtSubscription);
    }

    if (!leaveSubscription) {
        leaveSubscription = cleanupPlayerData;
        EventCoordinator.subscribeBefore("playerLeave", leaveSubscription);
    }

    if (!dimensionChangeSubscription) {
        dimensionChangeSubscription = handleDimensionChange;
        EventCoordinator.subscribeAfter("playerDimensionChange", dimensionChangeSubscription);
    }

    if (!isJobActive) {
        system.runJob(continuousNoClipLoop());
    }
}

/** Stops the NoClip detection module. */
export function stopNoClip(): void {
    isModuleActive = false;

    if (hurtSubscription) {
        EventCoordinator.unsubscribeAfter("entityHurt", hurtSubscription);
        hurtSubscription = undefined;
    }

    if (leaveSubscription) {
        EventCoordinator.unsubscribeBefore("playerLeave", leaveSubscription);
        leaveSubscription = undefined;
    }

    if (dimensionChangeSubscription) {
        EventCoordinator.unsubscribeAfter("playerDimensionChange", dimensionChangeSubscription);
        dimensionChangeSubscription = undefined;
    }

    playerData.clear();
    recentDamage.clear();
}
