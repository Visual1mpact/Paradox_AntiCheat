import { world, system, Player, GameMode, Block, AABB, EntityHurtAfterEvent, PlayerLeaveBeforeEvent } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { PlayerCache } from "../classes/player-cache";

/**
 * Number of ticks between checks.
 */
const CHECK_INTERVAL = 2;

/**
 * Number of detections required before action is taken.
 */
const PHASE_FLAGS_REQUIRED = 5;

/**
 * Collision tolerance in blocks to prevent false positives from minor clipping.
 */
const COLLISION_TOLERANCE = 0.15;

/**
 * Tracks players' movement history.
 */
const playerData = new Map<string, { lastPos: { x: number; y: number; z: number }; phaseFlags: number }>();

/**
 * Tracks recent damage to allow knockback exemptions.
 */
const recentDamage = new Map<string, number>();

let isNoClipActive = false;
let intervalRef: number | undefined;

/**
 * Determines if a block should allow movement through it.
 *
 * @param block - Block to evaluate
 * @returns True if block should be ignored for collision checks
 */
function isPassThrough(block: Block | undefined) {
    if (!block || !block.isValid) return true;
    if (block.isAir || block.isLiquid || !block.isSolid) return true;

    try {
        if (block.permutation.getState("open_bit") === true) return true;
    } catch {}

    return false;
}

/**
 * Returns the current timestamp in seconds.
 */
function now() {
    return Date.now() / 1000;
}

/**
 * Calculates Euclidean distance between two positions.
 */
function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Sends a NoClip alert to Level 4 security staff.
 *
 * @param offender - Player triggering the detection
 * @param dist - Distance moved through collision
 */
function alertStaff(offender: Player, dist: number) {
    const staff = getSecurityClearanceLevel4Players();

    for (const s of staff) {
        if (s.id === offender.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[NoClip] §f${offender.name} §7tried to phase §e${dist.toFixed(1)} blocks§7!`);
    }
}

/**
 * Converts a Bedrock AABB (center/extent) into min/max bounds.
 *
 * @param box - The AABB returned from getAABB()
 * @returns Bounding box with min/max coordinates
 */
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

/**
 * Performs a tolerance-aware swept AABB collision check for a player.
 *
 * This function detects if the player's bounding box moves through any solid
 * blocks between two positions, including corner clipping and diagonal movement.
 * It uses a small `COLLISION_TOLERANCE` to reduce false positives from minor clipping.
 *
 * The detection includes:
 * 1. Checking all 8 corners of the swept bounding box with tolerance.
 * 2. Scanning interior blocks if corners intersect solid blocks.
 * 3. Performing a mini ray-march along the movement path to catch diagonal clipping.
 *
 * @param player - The player whose movement is being evaluated.
 * @param start - The starting position `{ x, y, z }` of the player.
 * @param end - The ending position `{ x, y, z }` of the player.
 * @returns `true` if the movement intersects a solid block (NoClip detected), otherwise `false`.
 */
function sweptAABBWithTolerance(player: Player, start: { x: number; y: number; z: number }, end: { x: number; y: number; z: number }) {
    const dim = player.dimension;
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

    // Corners first, with tolerance
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
        const block = dim.getBlock({ x: Math.floor(corner.x), y: Math.floor(corner.y), z: Math.floor(corner.z) });
        if (!isPassThrough(block)) return true;
    }

    // Interior blocks
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
                const isCorner = (x === minX || x === maxX) && (y === minY || y === maxY) && (z === minZ || z === maxZ);
                if (isCorner) continue;

                const block = dim.getBlock({ x, y, z });
                if (!isPassThrough(block)) {
                    const blockMin = { x: x + COLLISION_TOLERANCE, y: y + COLLISION_TOLERANCE, z: z + COLLISION_TOLERANCE };
                    const blockMax = { x: x + 1 - COLLISION_TOLERANCE, y: y + 1 - COLLISION_TOLERANCE, z: z + 1 - COLLISION_TOLERANCE };

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

        const block = dim.getBlock({ x: bx, y: by, z: bz });
        if (!isPassThrough(block)) {
            const blockMin = { x: bx + COLLISION_TOLERANCE, y: by + COLLISION_TOLERANCE, z: bz + COLLISION_TOLERANCE };
            const blockMax = { x: bx + 1 - COLLISION_TOLERANCE, y: by + 1 - COLLISION_TOLERANCE, z: bz + 1 - COLLISION_TOLERANCE };

            if (px >= blockMin.x && px <= blockMax.x && py >= blockMin.y && py <= blockMax.y && pz >= blockMin.z && pz <= blockMax.z) return true;
        }
    }

    return false;
}

/**
 * Performs NoClip detection for a player.
 *
 * @param player - Player to evaluate
 */
function checkPlayer(player: Player) {
    const gameMode = player.getGameMode();
    if (gameMode === GameMode.Creative || gameMode === GameMode.Spectator) return;

    const uuid = player.id;
    if (now() - (recentDamage.get(uuid) ?? 0) < 2) return;

    const loc = player.location;

    let data = playerData.get(uuid);
    if (!data) {
        playerData.set(uuid, { lastPos: { x: loc.x, y: loc.y, z: loc.z }, phaseFlags: 0 });
        return;
    }

    const prev = data.lastPos;
    const cur = { x: loc.x, y: loc.y, z: loc.z };
    data.lastPos = cur;

    if (distance(prev, cur) < 0.75) {
        data.phaseFlags = Math.max(0, data.phaseFlags - 1);
        return;
    }

    const detected = sweptAABBWithTolerance(player, prev, cur);

    if (detected) {
        data.phaseFlags++;

        if (data.phaseFlags >= PHASE_FLAGS_REQUIRED) {
            player.sendMessage("§o§c[Paradox] You have been detected phasing through blocks!");
            alertStaff(player, distance(prev, cur));
            player.teleport(prev, { dimension: player.dimension });
            data.phaseFlags = 0;
        }
    } else {
        data.phaseFlags = Math.max(0, data.phaseFlags - 1);
    }
}

/**
 * Tracks player damage for knockback exemptions.
 */
function trackDamage(ev: EntityHurtAfterEvent) {
    if (ev.hurtEntity instanceof Player) recentDamage.set(ev.hurtEntity.id, now());
}

/**
 * Cleans up player tracking when they leave.
 */
function cleanupPlayerData(ev: PlayerLeaveBeforeEvent) {
    const player = ev.player;
    playerData.delete(player.id);
    recentDamage.delete(player.id);
}

/**
 * Starts the NoClip detection module.
 */
export function startNoClip() {
    if (isNoClipActive) return;
    isNoClipActive = true;

    intervalRef = system.runInterval(() => {
        for (const player of PlayerCache.getPlayers()) {
            try {
                checkPlayer(player);
            } catch {}
        }
    }, CHECK_INTERVAL);

    world.afterEvents.entityHurt.subscribe(trackDamage);
    world.beforeEvents.playerLeave.subscribe(cleanupPlayerData);
}

/**
 * Stops the NoClip detection module.
 */
export function stopNoClip() {
    if (!isNoClipActive) return;
    isNoClipActive = false;

    if (intervalRef !== undefined) {
        system.clearRun(intervalRef);
        intervalRef = undefined;
    }

    playerData.clear();
    recentDamage.clear();
}
