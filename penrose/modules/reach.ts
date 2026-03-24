import { world, Player, system, EntityHurtBeforeEvent, GameMode } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { PlayerCache } from "../classes/player-cache";

const MAX_REACH = 4.5;
const MAX_REACH_SQ = MAX_REACH * MAX_REACH;
const HISTORY_SIZE = 6;
const UPDATE_INTERVAL_TICKS = 6; // update every 6 ticks (~300ms)

/**
 * Stores a player's recent positions for reach detection.
 */
interface PlayerHistory {
    /** Flattened array of positions [x0,y0,z0, x1,y1,z1,...] */
    positions: Float32Array;
    /** Current index in the positions array */
    index: number;
}

/** Map of player IDs to their position history */
const playerHistory = new Map<string, PlayerHistory>();

/** Map of player IDs to their cached location per tick */
const cachedLocations = new Map<string, { x: number; y: number; z: number }>();

let intervalId: number | undefined;
let hurtSubscription: ((event: EntityHurtBeforeEvent) => void) | undefined;

/**
 * Calculates squared distance between two 3D points.
 * @param ax - X coordinate of point A
 * @param ay - Y coordinate of point A
 * @param az - Z coordinate of point A
 * @param bx - X coordinate of point B
 * @param by - Y coordinate of point B
 * @param bz - Z coordinate of point B
 * @returns Squared distance between points
 */
function distSq(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
    const dx = ax - bx;
    const dy = ay - by;
    const dz = az - bz;
    return dx * dx + dy * dy + dz * dz;
}

/**
 * Updates the position history for a player using a cached location.
 * Skips update if player hasn't moved since last recorded position.
 * @param player - Player whose position is being tracked
 * @param loc - Cached location object for the current tick
 */
function updatePlayerWithLoc(player: Player, loc: { x: number; y: number; z: number }) {
    const id = player.id;

    let data = playerHistory.get(id);

    if (!data) {
        data = { positions: new Float32Array(HISTORY_SIZE * 3), index: 0 };
        playerHistory.set(id, data);
    } else {
        const lastIndex = ((data.index - 1 + HISTORY_SIZE) % HISTORY_SIZE) * 3;
        const px = data.positions[lastIndex];
        const py = data.positions[lastIndex + 1];
        const pz = data.positions[lastIndex + 2];
        if (px === loc.x && py === loc.y && pz === loc.z) return;
    }

    const i = data.index * 3;
    data.positions[i] = loc.x;
    data.positions[i + 1] = loc.y;
    data.positions[i + 2] = loc.z;

    data.index = (data.index + 1) % HISTORY_SIZE;
}

/**
 * Retrieves the last recorded position of a player.
 * @param player - Player to retrieve position for
 * @returns Last position as {x, y, z} or null if none recorded
 */
function getLastPositionIndex(player: Player) {
    const data = playerHistory.get(player.id);
    if (!data) return -1;
    return ((data.index - 1 + HISTORY_SIZE) % HISTORY_SIZE) * 3;
}

/**
 * Sends an alert to staff with security clearance level 4 when a player exceeds reach distance.
 * @param attacker - Player who exceeded reach
 * @param distSqValue - Squared distance of attack
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
 * Event handler for player vs player damage using cached locations.
 * Cancels attack if the attacker exceeds max reach.
 * @param event - EntityHurtBeforeEvent triggered by Minecraft
 */
function onHitCached(event: EntityHurtBeforeEvent) {
    const attacker = event.damageSource.damagingEntity;
    const victim = event.hurtEntity;

    if (!(attacker instanceof Player) || !(victim instanceof Player)) return;
    if (attacker.getGameMode() === GameMode.Creative) return;

    const a = cachedLocations.get(attacker.id);
    const v = cachedLocations.get(victim.id);
    if (!a || !v) return;

    let d = distSq(a.x, a.y, a.z, v.x, v.y, v.z);
    if (d <= MAX_REACH_SQ) return;

    const ai = getLastPositionIndex(attacker);
    const vi = getLastPositionIndex(victim);

    if (ai === -1 || vi === -1) return;

    const ah = playerHistory.get(attacker.id)!.positions;
    const vh = playerHistory.get(victim.id)!.positions;

    d = distSq(ah[ai], ah[ai + 1], ah[ai + 2], vh[vi], vh[vi + 1], vh[vi + 2]);
    if (d > MAX_REACH_SQ) {
        event.cancel = true;
        alertStaff(attacker, d);
    }
}

/**
 * Updates cached player locations each tick and their history.
 */
function tickUpdate() {
    const players = PlayerCache.getPlayers();
    cachedLocations.clear();

    for (const player of players) {
        const loc = player.location;
        cachedLocations.set(player.id, { x: loc.x, y: loc.y, z: loc.z });
        updatePlayerWithLoc(player, loc);
    }
}

/**
 * Starts the hit reach check system.
 * Updates player positions at a set interval and subscribes once to entity hurt events.
 */
export function startHitReachCheck() {
    if (intervalId) system.clearRun(intervalId);
    if (hurtSubscription) world.beforeEvents.entityHurt.unsubscribe(hurtSubscription);

    hurtSubscription = onHitCached;
    world.beforeEvents.entityHurt.subscribe(hurtSubscription);

    intervalId = system.runInterval(tickUpdate, UPDATE_INTERVAL_TICKS);
}

/**
 * Stops the hit reach check system.
 * Clears interval and unsubscribes from entity hurt events.
 */
export function stopHitReachCheck() {
    if (intervalId) system.clearRun(intervalId);
    intervalId = undefined;

    if (hurtSubscription) {
        world.beforeEvents.entityHurt.unsubscribe(hurtSubscription);
        hurtSubscription = undefined;
    }

    playerHistory.clear();
    cachedLocations.clear();
}
