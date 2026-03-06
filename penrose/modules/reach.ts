import { world, Player, system, EntityHurtBeforeEvent, GameMode } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { PlayerCache } from "../classes/player-cache";

const MAX_REACH = 4.5;
const MAX_REACH_SQ = MAX_REACH * MAX_REACH;

const HISTORY_SIZE = 6;

/**
 * Stores a player's recent positions for reach detection.
 */
interface PlayerHistory {
    /** Array of x-coordinates */
    x: number[];
    /** Array of y-coordinates */
    y: number[];
    /** Array of z-coordinates */
    z: number[];
    /** Current index in the history arrays */
    index: number;
}

/** Map of player IDs to their position history */
const playerHistory = new Map<string, PlayerHistory>();

/**
 * Calculates the squared distance between two 3D points.
 * @param ax - X coordinate of the first point
 * @param ay - Y coordinate of the first point
 * @param az - Z coordinate of the first point
 * @param bx - X coordinate of the second point
 * @param by - Y coordinate of the second point
 * @param bz - Z coordinate of the second point
 * @returns Squared distance between the points
 */
function distSq(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
    const dx = ax - bx;
    const dy = ay - by;
    const dz = az - bz;
    return dx * dx + dy * dy + dz * dz;
}

/**
 * Updates the stored position history for a player.
 * @param player - Player whose position is being updated
 */
function updatePlayer(player: Player) {
    const id = player.id;
    const loc = player.location;

    let data = playerHistory.get(id);

    if (!data) {
        data = {
            x: new Array(HISTORY_SIZE),
            y: new Array(HISTORY_SIZE),
            z: new Array(HISTORY_SIZE),
            index: 0,
        };

        playerHistory.set(id, data);
    }

    const i = data.index;

    data.x[i] = loc.x;
    data.y[i] = loc.y;
    data.z[i] = loc.z;

    data.index++;

    if (data.index === HISTORY_SIZE) {
        data.index = 0;
    }
}

/**
 * Retrieves the last recorded position of a player.
 * @param player - Player to retrieve position for
 * @returns The last position as an object {x, y, z} or null if no history exists
 */
function getLastPosition(player: Player) {
    const data = playerHistory.get(player.id);
    if (!data) return null;

    let i = data.index - 1;
    if (i < 0) i = HISTORY_SIZE - 1;

    return {
        x: data.x[i],
        y: data.y[i],
        z: data.z[i],
    };
}

/**
 * Alerts staff members with security clearance level 4 about a reach violation.
 * @param attacker - Player who exceeded the reach distance
 * @param distSqValue - Squared distance of the attack
 */
function alertStaff(attacker: Player, distSqValue: number) {
    const staff = getSecurityClearanceLevel4Players();

    const distance = Math.sqrt(distSqValue);

    for (const s of staff) {
        if (s.id === attacker.id) continue;

        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Reach] §f${attacker.name} §7hit too far: §e${distance.toFixed(2)} blocks`);
    }
}

/**
 * Event handler for player vs player damage.
 * Cancels the attack if the attacker is too far from the victim.
 * @param event - EntityHurtBeforeEvent provided by Minecraft
 */
function onHit(event: EntityHurtBeforeEvent) {
    const attacker = event.damageSource.damagingEntity;
    const victim = event.hurtEntity;

    if (!(attacker instanceof Player)) return;
    if (!(victim instanceof Player)) return;

    if (attacker.getGameMode() === GameMode.Creative) return;

    const a = attacker.location;
    const v = victim.location;

    let d = distSq(a.x, a.y, a.z, v.x, v.y, v.z);

    if (d <= MAX_REACH_SQ) return;

    const ah = getLastPosition(attacker);
    const vh = getLastPosition(victim);

    if (!ah || !vh) return;

    d = distSq(ah.x, ah.y, ah.z, vh.x, vh.y, vh.z);

    if (d > MAX_REACH_SQ) {
        event.cancel = true;
        alertStaff(attacker, d);
    }
}

let intervalId: number | undefined;

/**
 * Starts the hit reach check system.
 * Tracks player positions and subscribes to entity hurt events.
 */
export function startHitReachCheck() {
    if (intervalId) system.clearRun(intervalId);

    intervalId = system.runInterval(() => {
        const players = PlayerCache.getPlayers();

        for (const player of players) {
            updatePlayer(player);
        }
    }, 1);

    world.beforeEvents.entityHurt.subscribe(onHit);
}

/**
 * Stops the hit reach check system.
 * Clears interval and unsubscribes from entity hurt events.
 */
export function stopHitReachCheck() {
    if (intervalId) system.clearRun(intervalId);

    world.beforeEvents.entityHurt.unsubscribe(onHit);
}
