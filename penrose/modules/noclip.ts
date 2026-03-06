import { world, system, Player, GameMode, Block } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { PlayerCache } from "../classes/player-cache";

/**
 * Stores per-player phase detection data
 */
type PlayerData = {
    lastPos: { x: number; y: number; z: number };
    phaseFlags: number;
    voxelCache: Set<string>; // blocks currently overlapping
};

/** Interval (in ticks) between NoClip checks */
const CHECK_INTERVAL = 10;

/** Number of consecutive phase detections before flagging */
const PHASE_FLAGS_REQUIRED = 7;

/** Player hitbox dimensions for Bedrock */
const PLAYER_HITBOX = { width: 0.6, height: 1.8, depth: 0.6 };

/** Fractional voxel grid resolution for slow-phase detection */
const VOXEL_STEP = 0.32;

/** Tracks per-player data */
const playerData = new Map<string, PlayerData>();

/** Tracks recent damage for knockback exemption */
const recentDamage = new Map<string, number>();

/** Internal flag to indicate if the module is active */
let isNoClipActive = false;

/** Reference for the interval running the detection loop */
let intervalRef: number | undefined;

/**
 * Determines whether a block should be treated as pass-through for movement
 * or noclip detection.
 *
 * @param block - The {@link Block} instance to evaluate.
 * @returns `true` if the block should allow movement through it; otherwise `false`.
 */
function isPassThrough(block: Block | undefined | null): boolean {
    if (!block || !block.isValid) return true;
    if (block.isAir || block.isLiquid || !block.isSolid) return true;

    const perm = block.permutation;
    try {
        if (perm.getState("open_bit") === true) return true; // doors/trapdoors
    } catch {}

    return false;
}

/**
 * Sends a NoClip violation alert to all Level 4 staff.
 * @param offender - Player who triggered the detection
 * @param distance - Distance the player tried to phase through
 */
function alertStaff(offender: Player, distance: number) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s.id === offender.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[NoClip] §f${offender.name} §7tried to phase §e${distance.toFixed(1)} blocks§7!`);
    }
}

/** Returns current timestamp in seconds */
function now(): number {
    return Date.now() / 1000;
}

/** Computes Euclidean distance between two positions */
function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    const dx = a.x - b.x,
        dy = a.y - b.y,
        dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Fractional voxel sweep for anti-cheat detection.
 * Uses a 3D grid inside the player's hitbox to detect partial entry into solid blocks.
 */
function sweepHitboxVoxel(player: Player, start: { x: number; y: number; z: number }, end: { x: number; y: number; z: number }, voxelCache: Set<string>): boolean {
    const dim = player.dimension;
    const dx = (end.x - start.x) / CHECK_INTERVAL;
    const dy = (end.y - start.y) / CHECK_INTERVAL;
    const dz = (end.z - start.z) / CHECK_INTERVAL;

    let px = start.x;
    let py = start.y;
    let pz = start.z;

    const newCache = new Set<string>();

    for (let step = 0; step < CHECK_INTERVAL; step++) {
        px += dx;
        py += dy;
        pz += dz;

        for (let x = px - PLAYER_HITBOX.width / 2; x <= px + PLAYER_HITBOX.width / 2; x += VOXEL_STEP) {
            for (let y = py; y <= py + PLAYER_HITBOX.height; y += VOXEL_STEP) {
                for (let z = pz - PLAYER_HITBOX.depth / 2; z <= pz + PLAYER_HITBOX.depth / 2; z += VOXEL_STEP) {
                    const bx = Math.floor(x);
                    const by = Math.floor(y);
                    const bz = Math.floor(z);

                    const voxelId = `${bx},${by},${bz}`;
                    newCache.add(voxelId);

                    if (!voxelCache.has(voxelId)) {
                        // new block entered
                        try {
                            const block = dim.getBlock({ x: bx, y: by, z: bz });
                            if (block && !isPassThrough(block)) {
                                return true;
                            }
                        } catch {}
                    }
                }
            }
        }
    }

    // update cache for next tick
    voxelCache.clear();
    for (const v of newCache) voxelCache.add(v);

    return false;
}

/**
 * Performs a NoClip check on a single player.
 * @param player - Player to check
 */
function checkPlayer(player: Player) {
    if (player.getGameMode() === GameMode.Creative || player.getGameMode() === GameMode.Spectator) return;

    const uuid = player.id;
    if (now() - (recentDamage.get(uuid) ?? 0) < 2) return; // knockback exemption

    const loc = player.location;
    let data = playerData.get(uuid);

    if (!data) {
        playerData.set(uuid, { lastPos: { x: loc.x, y: loc.y, z: loc.z }, phaseFlags: 0, voxelCache: new Set() });
        return;
    }

    const prev = data.lastPos;
    const cur = { x: loc.x, y: loc.y, z: loc.z };
    data.lastPos = cur;

    if (distance(prev, cur) < 0.35) {
        data.phaseFlags = Math.max(0, data.phaseFlags - 1);
        return;
    }

    const detected = sweepHitboxVoxel(player, prev, cur, data.voxelCache);

    if (detected) {
        data.phaseFlags++;
        if (data.phaseFlags >= PHASE_FLAGS_REQUIRED) {
            player.sendMessage("§cYou have been detected phasing through blocks!");
            alertStaff(player, distance(prev, cur));
            player.teleport(prev, { dimension: player.dimension });
            data.phaseFlags = 0;
        }
    } else {
        data.phaseFlags = Math.max(0, data.phaseFlags - 1);
    }
}

/**
 * Tracks player damage for knockback exemption.
 * @param ev - The entity hurt event
 */
function trackDamage(ev: any) {
    if (ev.hurtEntity instanceof Player) {
        recentDamage.set(ev.hurtEntity.id, now());
    }
}

/**
 * Cleans up per-player data when they leave.
 * @param ev - Player leave event
 */
function cleanupPlayerData(ev: any) {
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

    if (intervalRef) {
        system.clearRun(intervalRef);
        intervalRef = undefined;
    }

    playerData.clear();
    recentDamage.clear();
}
