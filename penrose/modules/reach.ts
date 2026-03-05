import { world, Player, system, EntityHurtBeforeEvent, GameMode } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

/**
 * RUNTIME STATE
 */
let currentRunId: number | null = null; // Interval ID for updating player position history
let runIdBackup: number | null = null; // Backup for overlapping intervals

/**
 * CONFIGURATION
 */
const MAX_ATTACK_DISTANCE = 4.5; // Maximum allowed distance for a valid attack
const HISTORY_SIZE = 10; // Number of past positions stored per player

/**
 * Player position and velocity history storage
 */
const playerData = new Map<string, PlayerData>();

/**
 * Represents a 3D position in the world
 */
interface Position {
    x: number;
    y: number;
    z: number;
}

/**
 * Stores historical movement data for a player
 */
interface PlayerData {
    history: PlayerHistoryEntry[];
}

/**
 * A single history entry: position, velocity, tick timestamp
 */
interface PlayerHistoryEntry {
    position: Position;
    velocity: Position;
    timestamp: number;
}

/**
 * Calculate Euclidean distance between two 3D points
 */
function calculateDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2));
}

/**
 * Perform Catmull-Rom cubic interpolation between four positions
 * @param p0 - Control point before start
 * @param p1 - Start point
 * @param p2 - End point
 * @param p3 - Control point after end
 * @param t - Interpolation ratio (0 = p1, 1 = p2)
 */
function cubicInterpolate(p0: Position, p1: Position, p2: Position, p3: Position, t: number): Position {
    const t2 = t * t,
        t3 = t2 * t;
    return {
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        z: 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
    };
}

/**
 * Record a player's current position, velocity, and tick
 * Maintains a fixed-length history for interpolation
 */
function updatePlayerData(player: Player): void {
    const currentTick = system.currentTick;
    const currentPosition = player.location;
    const currentVelocity = player.getVelocity();

    let data = playerData.get(player.name);
    if (!data) {
        data = { history: [] };
        playerData.set(player.name, data);
    }

    data.history.push({ position: currentPosition, velocity: currentVelocity, timestamp: currentTick });

    // Maintain fixed history length
    if (data.history.length > HISTORY_SIZE) data.history.shift();
}

/**
 * Estimate a player's position at a past tick using cubic interpolation
 * Returns undefined if there is not enough history
 */
function estimatePositionUsingInterpolation(player: Player, hitTime: number): Position | undefined {
    const data = playerData.get(player.name);
    if (!data || data.history.length < 4) return undefined;

    const [p0, p1, p2, p3] = data.history;
    const timeRatio = (hitTime - p1.timestamp) / (p2.timestamp - p1.timestamp);

    if (timeRatio <= 0) return p1.position;
    if (timeRatio >= 1) return p2.position;

    return cubicInterpolate(p0.position, p1.position, p2.position, p3.position, timeRatio);
}

/**
 * Notify Level 4 staff that a player exceeded the allowed reach distance
 */
function alertStaff(attacker: Player, distance: number) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s.id === attacker.id) continue; // Skip attacker if they are staff
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Reach] §f${attacker.name} §7hit too far: §e${distance.toFixed(2)} blocks`);
    }
}

/**
 * Pre-damage event handler for reach checks
 * Cancels the hit if the attacker is too far and not in Creative mode
 */
function handleHurtEvent(event: EntityHurtBeforeEvent) {
    const attacker = event.damageSource.damagingEntity;
    const victim = event.hurtEntity;

    // Only track Player vs Player
    if (!(attacker instanceof Player) || !(victim instanceof Player)) return;
    if (attacker.getGameMode() === GameMode.Creative) return;

    const currentTick = system.currentTick;

    // Check direct distance first
    const directDistance = calculateDistance(attacker.location, victim.location);
    if (directDistance <= MAX_ATTACK_DISTANCE) return;

    // Estimate positions using historical interpolation for more accurate reach detection
    const estimatedAttackerPos = estimatePositionUsingInterpolation(attacker, currentTick - 1) ?? attacker.location;
    const estimatedVictimPos = estimatePositionUsingInterpolation(victim, currentTick - 1) ?? victim.location;
    const correctedDistance = calculateDistance(estimatedAttackerPos, estimatedVictimPos);

    // If corrected distance is still too far, cancel the hit and alert staff
    if (correctedDistance > MAX_ATTACK_DISTANCE) {
        event.cancel = true;
        alertStaff(attacker, correctedDistance);
    }
}

/**
 * Start the reach check system
 * Continuously updates player position history and subscribes to pre-damage events
 */
export function startHitReachCheck(): void {
    if (currentRunId !== null) system.clearRun(currentRunId);

    let isRunning = false;

    currentRunId = system.runInterval(() => {
        if (isRunning) {
            system.clearRun(currentRunId as number);
            currentRunId = runIdBackup;
            return;
        }

        runIdBackup = currentRunId;
        isRunning = true;

        // Update all online players' positions for interpolation
        for (const player of world.getPlayers()) updatePlayerData(player);

        isRunning = false;
    }, 1);

    // Subscribe to pre-damage event for reach validation
    world.beforeEvents.entityHurt.subscribe(handleHurtEvent);
}

/**
 * Stop the reach check system
 * Clears interval and unsubscribes from pre-damage events
 */
export function stopHitReachCheck(): void {
    if (currentRunId !== null) system.clearRun(currentRunId);
    world.beforeEvents.entityHurt.unsubscribe(handleHurtEvent);
}
