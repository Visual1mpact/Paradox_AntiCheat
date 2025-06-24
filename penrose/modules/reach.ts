import { world, Player, system, EntityHitEntityAfterEvent, GameMode } from "@minecraft/server";

let currentRunId: number | null = null;
let runIdBackup: number | null = null;

/**
 * Maximum allowed distance between players for a legitimate hit.
 */
const MAX_ATTACK_DISTANCE = 4.5;

/**
 * Number of past positions to store for each player.
 */
const HISTORY_SIZE = 10;

/**
 * Map storing movement history for each player by name.
 */
const playerData = new Map<string, PlayerData>();

/**
 * Represents a 3D position in the world.
 */
interface Position {
    x: number;
    y: number;
    z: number;
}

/**
 * Stores historical movement data for a player.
 */
interface PlayerData {
    history: PlayerHistoryEntry[];
}

/**
 * A single entry of position, velocity, and tick timestamp.
 */
interface PlayerHistoryEntry {
    position: Position;
    velocity: Position;
    timestamp: number;
}

/**
 * Calculates the 3D Euclidean distance between two positions.
 * @param pos1 - The first position.
 * @param pos2 - The second position.
 * @returns The distance between the two points.
 */
function calculateDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2));
}

/**
 * Performs Catmull-Rom cubic interpolation between four points.
 * @param p0 - First control point.
 * @param p1 - Second control point (start point).
 * @param p2 - Third control point (end point).
 * @param p3 - Fourth control point.
 * @param t - Interpolation ratio (0 to 1).
 * @returns Interpolated position.
 */
function cubicInterpolate(p0: Position, p1: Position, p2: Position, p3: Position, t: number): Position {
    const t2 = t * t;
    const t3 = t2 * t;
    return {
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        z: 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
    };
}

/**
 * Records the player's current position and velocity along with the tick timestamp.
 * @param player - The player whose data is being recorded.
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

    data.history.push({
        position: currentPosition,
        velocity: currentVelocity,
        timestamp: currentTick,
    });

    if (data.history.length > HISTORY_SIZE) {
        data.history.shift(); // Maintain fixed history size
    }
}

/**
 * Estimates the player's position at a past tick using cubic interpolation.
 * @param player - The player whose past position is to be estimated.
 * @param hitTime - The game tick at which the hit occurred.
 * @returns The interpolated position, or `undefined` if not enough history is available.
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
 * Handles hit events between entities and checks for invalid reach.
 * If the distance is illegitimate, the hit is rolled back by restoring health.
 * @param eventData - The entity hit event data.
 */
function handleEntityHit(eventData: EntityHitEntityAfterEvent): void {
    const currentTick = system.currentTick;
    const attacker = eventData.damagingEntity;
    const victim = eventData.hitEntity;

    if (!(attacker instanceof Player && victim instanceof Player)) return;
    if (attacker.getGameMode() === GameMode.Creative) return;

    const directDistance = calculateDistance(attacker.location, victim.location);
    if (directDistance <= MAX_ATTACK_DISTANCE) return;

    const estimatedAttackerPos = estimatePositionUsingInterpolation(attacker, currentTick - 1) ?? attacker.location;
    const estimatedVictimPos = estimatePositionUsingInterpolation(victim, currentTick - 1) ?? victim.location;
    const correctedDistance = calculateDistance(estimatedAttackerPos, estimatedVictimPos);

    if (correctedDistance <= MAX_ATTACK_DISTANCE) return;

    const healthComponentVictim = victim.getComponent("health");
    if (!healthComponentVictim) return;

    let beforeHealthVictim = victim.getDynamicProperty("paradoxCurrentHealth") as number;
    if (beforeHealthVictim === undefined) {
        beforeHealthVictim = healthComponentVictim.currentValue;
        victim.setDynamicProperty("paradoxCurrentHealth", beforeHealthVictim);
    }

    const currentHealthVictim = healthComponentVictim.currentValue;
    if (beforeHealthVictim > currentHealthVictim) {
        const healthDiff = beforeHealthVictim - currentHealthVictim;
        healthComponentVictim.setCurrentValue(currentHealthVictim + healthDiff);
    }
}

/**
 * Starts the hit reach check system by polling all players’ positions
 * and subscribing to hit events for reach validation.
 */
export function startHitReachCheck(): void {
    if (currentRunId !== null) {
        system.clearRun(currentRunId);
    }

    let isRunning = false;

    currentRunId = system.runInterval(() => {
        if (isRunning) {
            system.clearRun(currentRunId);
            currentRunId = runIdBackup;
            return;
        }

        runIdBackup = currentRunId;
        isRunning = true;

        const players = world.getPlayers();

        for (const player of players) {
            updatePlayerData(player);
        }

        isRunning = false;
    }, 1);

    world.afterEvents.entityHitEntity.subscribe(handleEntityHit);
}

/**
 * Stops the hit reach check system by clearing the interval
 * and unsubscribing from the entity hit event.
 */
export function stopHitReachCheck(): void {
    system.clearRun(currentRunId);
    world.afterEvents.entityHitEntity.unsubscribe(handleEntityHit);
}
