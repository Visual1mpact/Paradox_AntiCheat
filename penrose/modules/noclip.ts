import { world, system, Player, GameMode, Block } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { PlayerCache } from "../classes/player-cache";

/**
 * Stores per-player data for phase detection
 */
type PlayerData = {
    lastPos: { x: number; y: number; z: number };
    phaseFlags: number;
};

/** Interval (in ticks) between NoClip checks */
const CHECK_INTERVAL = 10;

/** Number of consecutive phase detections before flagging */
const PHASE_FLAGS_REQUIRED = 3;

/** Player hitbox dimensions for Bedrock */
const PLAYER_HITBOX = { width: 0.6, height: 1.8, depth: 0.6 };

/** Number of steps along movement path for voxel sweep */
const PATH_STEPS = 6;

/** Blocks that can be passed through (non-solid for NoClip detection) */
const PASSTHROUGH = new Set([
    "air",
    "cave_air",
    "void_air",
    "water",
    "flowing_water",
    "lava",
    "flowing_lava",
    "door",
    "trapdoor",
    "fence_gate",
    "sign",
    "wall_sign",
    "hanging_sign",
    "torch",
    "soul_torch",
    "redstone_torch",
    "carpet",
    "snow_layer",
    "moss_carpet",
    "pressure_plate",
    "button",
    "lever",
    "rail",
    "powered_rail",
    "detector_rail",
    "activator_rail",
    "flower",
    "sapling",
    "dead_bush",
    "fern",
    "grass",
    "tallgrass",
    "tall_grass",
    "large_fern",
    "vine",
    "ladder",
    "scaffolding",
    "banner",
    "standing_banner",
    "wall_banner",
    "cobweb",
    "web",
    "skull",
    "head",
    "end_rod",
    "chain",
    "lantern",
    "soul_lantern",
    "candle",
    "cake",
    "redstone_wire",
    "tripwire",
    "string",
    "structure_void",
    "barrier",
    "light_block",
]);

/** Tracks per-player data */
const playerData = new Map<string, PlayerData>();

/** Tracks recent damage for knockback exemption */
const recentDamage = new Map<string, number>();

/** Internal flag to indicate if the module is active */
let isNoClipActive = false;

/** Reference for the interval running the detection loop */
let intervalRef: number | undefined;

/**
 * Sends a NoClip violation alert to all Level 4 staff.
 * @param {Player} offender - Player who triggered the detection
 * @param {number} distance - Distance the player tried to phase through
 */
function alertStaff(offender: Player, distance: number) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s.id === offender.id) continue; // skip offender if staff
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[NoClip] §f${offender.name} §7tried to phase §e${distance.toFixed(1)} blocks§7!`);
    }
}

/**
 * Returns current timestamp in seconds
 * @returns {number} Current time
 */
function now() {
    return Date.now() / 1000;
}

/**
 * Determines whether a block type is considered solid
 * @param {string} type - Block type string
 * @returns {boolean} True if solid
 */
function isSolid(type: string) {
    const name = type.toLowerCase().replace("minecraft:", "");
    for (const pt of PASSTHROUGH) if (name.includes(pt)) return false;
    return true;
}

/**
 * Computes Euclidean distance between two positions
 * @param {any} a - First position
 * @param {any} b - Second position
 * @returns {number} Distance
 */
function distance(a: any, b: any) {
    const dx = a.x - b.x,
        dy = a.y - b.y,
        dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Sweeps the player's hitbox along movement path and checks for solid block collisions
 * @param {Player} player - Player to check
 * @param {any} start - Start position
 * @param {any} end - End position
 * @returns {boolean} True if player intersects a solid block
 */
function sweepHitbox(player: Player, start: any, end: any): boolean {
    const dx = (end.x - start.x) / PATH_STEPS;
    const dy = (end.y - start.y) / PATH_STEPS;
    const dz = (end.z - start.z) / PATH_STEPS;

    for (let step = 1; step <= PATH_STEPS; step++) {
        const px = start.x + dx * step;
        const py = start.y + dy * step;
        const pz = start.z + dz * step;

        const offsets = [
            { x: -0.3, z: -0.3 },
            { x: -0.3, z: 0.3 },
            { x: 0.3, z: -0.3 },
            { x: 0.3, z: 0.3 },
        ];

        for (const o of offsets) {
            for (let h = 0; h <= PLAYER_HITBOX.height; h += 0.5) {
                const bx = Math.floor(px + o.x);
                const by = Math.floor(py + h);
                const bz = Math.floor(pz + o.z);

                try {
                    const block: Block | undefined = player.dimension.getBlock({ x: bx, y: by, z: bz });
                    if (block && isSolid(block.typeId)) return true;
                } catch {}
            }
        }
    }

    return false;
}

/**
 * Performs a NoClip check on a single player
 * @param {Player} player - Player to check
 */
function checkPlayer(player: Player) {
    if (player.getGameMode() === GameMode.Creative || player.getGameMode() === GameMode.Spectator) return;

    const uuid = player.id;
    if (now() - (recentDamage.get(uuid) ?? 0) < 2) return; // knockback exemption

    const loc = player.location;
    let data = playerData.get(uuid);

    if (!data) {
        playerData.set(uuid, { lastPos: { x: loc.x, y: loc.y, z: loc.z }, phaseFlags: 0 });
        return;
    }

    const prev = data.lastPos;
    const cur = { x: loc.x, y: loc.y, z: loc.z };
    data.lastPos = cur;

    if (distance(prev, cur) < 0.15) {
        data.phaseFlags = Math.max(0, data.phaseFlags - 1);
        return;
    }

    const detected = sweepHitbox(player, prev, cur);

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
 * Starts the NoClip detection module.
 * Initializes the interval loop and subscribes to events.
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
 * Clears interval, unsubscribes events, and resets data.
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
