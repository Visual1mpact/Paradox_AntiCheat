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

/** Tracks players' movement history and dimension context. */
const playerData = new Map<
    string,
    {
        lastPos: { x: number; y: number; z: number };
        dimensionId: string;
        phaseFlags: number;
    }
>();

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
 * @param dim - Dimension instance
 * @param pos - Block position to evaluate
 * @returns True if block should be ignored for collision checks
 */
function isPassThrough(dim: any, pos: { x: number; y: number; z: number }): boolean {
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
function now() {
    return Date.now() / 1000;
}

/** Calculates Euclidean distance between two positions. */
function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Sends a NoClip alert to Level 4 security staff. */
function alertStaff(offender: Player, dist: number) {
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    FlagManager.logFlag(offender, "NoClip", `Player tried to phase ${dist.toFixed(1)} blocks.`);
    for (const s of staff) {
        if (!s?.isValid || s.id === offender.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[NoClip] §f${offender.name} §7tried to phase §e${dist.toFixed(1)} blocks§7!`);
    }
}

/** Converts a Bedrock AABB (center/extent) into min/max bounds. */
function getBounds(box: AABB) {
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

/** Performs a tolerance-aware swept AABB collision check for a player. */
function sweptAABBWithTolerance(player: Player, dim: Dimension, start: { x: number; y: number; z: number }, end: { x: number; y: number; z: number }) {
    const base = getBounds(player.getAABB());

    const movement = {
        x: end.x - start.x,
        y: end.y - start.y,
        z: end.z - start.z,
    };

    const sweep = {
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

    const minX = Math.floor(sweep.min.x);
    const maxX = Math.floor(sweep.max.x);
    const minY = Math.floor(sweep.min.y);
    const maxY = Math.floor(sweep.max.y);
    const minZ = Math.floor(sweep.min.z);
    const maxZ = Math.floor(sweep.max.z);

    // Corners check with tolerance
    const corners = [
        { x: minX + COLLISION_TOLERANCE, y: minY + COLLISION_TOLERANCE, z: minZ + COLLISION_TOLERANCE },
        { x: minX + COLLISION_TOLERANCE, y: minY + COLLISION_TOLERANCE, z: maxZ + 1 - COLLISION_TOLERANCE },
        { x: minX + COLLISION_TOLERANCE, y: maxY + 1 - COLLISION_TOLERANCE, z: minZ + COLLISION_TOLERANCE },
        { x: minX + COLLISION_TOLERANCE, y: maxY + 1 - COLLISION_TOLERANCE, z: maxZ + 1 - COLLISION_TOLERANCE },
        { x: maxX + 1 - COLLISION_TOLERANCE, y: minY + COLLISION_TOLERANCE, z: minZ + COLLISION_TOLERANCE },
        { x: maxX + 1 - COLLISION_TOLERANCE, y: minY + COLLISION_TOLERANCE, z: maxZ + 1 - COLLISION_TOLERANCE },
        { x: maxX + 1 - COLLISION_TOLERANCE, y: maxY + 1 - COLLISION_TOLERANCE, z: minZ + COLLISION_TOLERANCE },
        { x: maxX + 1 - COLLISION_TOLERANCE, y: maxY + 1 - COLLISION_TOLERANCE, z: maxZ + 1 - COLLISION_TOLERANCE },
    ];

    for (const corner of corners) {
        if (!isPassThrough(dim, corner)) return true;
    }

    // Interior blocks check
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
                const isCorner = (x === minX || x === maxX) && (y === minY || y === maxY) && (z === minZ || z === maxZ);
                if (isCorner) continue;

                if (!isPassThrough(dim, { x, y, z })) {
                    const blockMin = {
                        x: x + COLLISION_TOLERANCE,
                        y: y + COLLISION_TOLERANCE,
                        z: z + COLLISION_TOLERANCE,
                    };
                    const blockMax = {
                        x: x + 1 - COLLISION_TOLERANCE,
                        y: y + 1 - COLLISION_TOLERANCE,
                        z: z + 1 - COLLISION_TOLERANCE,
                    };

                    if (sweep.min.x <= blockMax.x && sweep.max.x >= blockMin.x && sweep.min.y <= blockMax.y && sweep.max.y >= blockMin.y && sweep.min.z <= blockMax.z && sweep.max.z >= blockMin.z) return true;
                }
            }
        }
    }

    // Mini ray-march along path
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
            const blockMin = {
                x: bx + COLLISION_TOLERANCE,
                y: by + COLLISION_TOLERANCE,
                z: bz + COLLISION_TOLERANCE,
            };
            const blockMax = {
                x: bx + 1 - COLLISION_TOLERANCE,
                y: by + 1 - COLLISION_TOLERANCE,
                z: bz + 1 - COLLISION_TOLERANCE,
            };

            if (px >= blockMin.x && px <= blockMax.x && py >= blockMin.y && py <= blockMax.y && pz >= blockMin.z && pz <= blockMax.z) return true;
        }
    }

    return false;
}

/** Performs NoClip detection for a player. */
function checkPlayer(player: Player) {
    const gameMode = player.getGameMode();
    if (gameMode === GameMode.Creative || gameMode === GameMode.Spectator) return;

    const uuid = player.id;
    if (now() - (recentDamage.get(uuid) ?? 0) < 2) return;

    // Retrieve cached location and dimension data
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

    // Safeguard 1: Dimension changed without triggering event callback yet
    // Safeguard 2: Distance exceeds MAX_CHECK_DISTANCE (e.g. Teleports / ender pearls)
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
        data.phaseFlags++;

        if (data.phaseFlags >= PHASE_FLAGS_REQUIRED) {
            player.sendMessage("§o§c[Paradox] You have been detected phasing through blocks!");
            alertStaff(player, movedDist);
            player.teleport(prev, { dimension: dimension });
            data.phaseFlags = 0;
        }
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
            } catch (e) {
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
function trackDamage(ev: EntityHurtAfterEvent) {
    if (ev.hurtEntity instanceof Player) recentDamage.set(ev.hurtEntity.id, now());
}

/** Cleans up player tracking when they leave. */
function cleanupPlayerData(ev: PlayerLeaveBeforeEvent) {
    const player = ev.player;
    playerData.delete(player.id);
    recentDamage.delete(player.id);
}

/** Updates tracking state upon explicit dimension change events. */
function handleDimensionChange(ev: PlayerDimensionChangeAfterEvent) {
    const player = ev.player;
    if (!player?.isValid) return;

    playerData.set(player.id, {
        lastPos: { x: ev.toLocation.x, y: ev.toLocation.y, z: ev.toLocation.z },
        dimensionId: ev.toDimension.id,
        phaseFlags: 0,
    });
}

/** Starts the NoClip detection module. */
export function startNoClip() {
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
export function stopNoClip() {
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
