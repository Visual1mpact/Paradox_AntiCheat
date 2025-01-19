import { world, Player, system, EntityHitEntityAfterEvent, GameMode } from "@minecraft/server";

let currentRunId: number | null = null;
let runIdBackup: number | null = null;

// Configuration constants
const MAX_ATTACK_DISTANCE = 4.5; // Roughly 3 is the real value but due to movement we increase for a buffer
const HISTORY_SIZE = 10; // Number of recent positions to keep
const playerData = new Map<string, PlayerData>();

interface Position {
    x: number;
    y: number;
    z: number;
}

interface PlayerData {
    history: PlayerHistoryEntry[];
}

interface PlayerHistoryEntry {
    position: Position;
    velocity: Position;
    timestamp: number;
}

/**
 * Calculate the Euclidean distance between two positions.
 * @param pos1 - The first position.
 * @param pos2 - The second position.
 * @returns The Euclidean distance between the two positions.
 */
function calculateDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2) + Math.pow(pos1.z - pos2.z, 2));
}

/**
 * Perform cubic interpolation to estimate a position based on four points.
 * @param p0 - The position at time t-1.
 * @param p1 - The position at time t.
 * @param p2 - The position at time t+1.
 * @param p3 - The position at time t+2.
 * @param t - The interpolation factor (0 <= t <= 1).
 * @returns The interpolated position.
 */
function cubicInterpolate(p0: Position, p1: Position, p2: Position, p3: Position, t: number): Position {
    const t2 = t * t;
    const t3 = t2 * t;
    const result: Position = {
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        z: 0.5 * (2 * p1.z + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
    };

    return result;
}

/**
 * Update the stored player data with the latest position and velocity.
 * @param player - The player whose data is being updated.
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

    if (data.history.length > HISTORY_SIZE) {
        data.history.shift();
    }
}

/**
 * Estimate the position of the player at a given hit time using cubic interpolation.
 * @param player - The player whose position is being estimated.
 * @param hitTime - The target time to estimate the player's position.
 * @returns The estimated position of the player, or undefined if not enough data is available.
 */
function estimatePositionUsingInterpolation(player: Player, hitTime: number): Position | undefined {
    const data = playerData.get(player.name);
    if (!data || data.history.length < 4) return undefined;

    const [p0, p1, p2, p3] = data.history;

    // Calculate timeRatio
    const timeRatio = (hitTime - p1.timestamp) / (p2.timestamp - p1.timestamp);

    // Handle cases where timeRatio is out of range
    if (timeRatio <= 0) {
        return p1.position;
    } else if (timeRatio >= 1) {
        return p2.position;
    }

    return cubicInterpolate(p0.position, p1.position, p2.position, p3.position, timeRatio);
}

/**
 * Handle the entity hit event and restore health if the attack distance exceeds the maximum allowed distance.
 * @param eventData - The event data containing information about the hit.
 */
/**
 * Handle the entity hit event and restore health if the attack distance exceeds the maximum allowed distance.
 * @param eventData - The event data containing information about the hit.
 */
function handleEntityHit(eventData: EntityHitEntityAfterEvent): void {
    const currentTick = system.currentTick;
    const attacker = eventData.damagingEntity;
    const victim = eventData.hitEntity;

    if (!(attacker instanceof Player && victim instanceof Player)) return; // Early return if not player objects

    if (attacker.getGameMode() === GameMode.creative) return; // Early return if in creative mode

    const attackerPosition = attacker.location;
    const victimPosition = victim.location;

    // Calculate the direct distance first as a quick filter
    const distance = calculateDistance(attackerPosition, victimPosition);
    if (distance <= MAX_ATTACK_DISTANCE) return; // Early return if within the allowed range

    // Estimate the attacker’s position at the time of hit
    const estimatedPosition = estimatePositionUsingInterpolation(attacker, currentTick - 1);
    if (!estimatedPosition) return; // Early return if the estimated position is not available

    // Recalculate the distance using the estimated position
    const correctedDistance = calculateDistance(estimatedPosition, victimPosition);
    if (correctedDistance <= MAX_ATTACK_DISTANCE) return; // Early return if corrected distance is within range

    // Get the victim's health component
    const healthComponentVictim = victim.getComponent("health");
    if (!healthComponentVictim) return; // Early return if health component is not available

    // Get the victim's health before the attack
    let beforeHealthVictim = victim.getDynamicProperty("paradoxCurrentHealth") as number;
    if (beforeHealthVictim === undefined) {
        // Initialize the dynamic property if it is not defined
        beforeHealthVictim = healthComponentVictim.currentValue;
        victim.setDynamicProperty("paradoxCurrentHealth", beforeHealthVictim);
    }

    // Calculate health difference and restore the victim's health
    const currentHealthVictim = healthComponentVictim.currentValue;
    if (beforeHealthVictim > currentHealthVictim) {
        const healthDiffVictim = beforeHealthVictim - currentHealthVictim;
        const restoreHealthVictim = currentHealthVictim + healthDiffVictim;
        healthComponentVictim.setCurrentValue(restoreHealthVictim);
    }
}

/**
 * Initialize the entity hit detection system.
 */
export function startHitReachCheck(): void {
    if (currentRunId !== null) {
        // Clear any existing run before starting a new one
        system.clearRun(currentRunId);
    }

    let isRunning = false;

    currentRunId = system.runInterval(() => {
        if (isRunning) {
            // Restore the backup runId if an overlap is detected
            system.clearRun(currentRunId);
            currentRunId = runIdBackup;
            return; // Skip this iteration if the previous one is still running
        }

        // Backup the current runId before starting the new one
        runIdBackup = currentRunId;
        isRunning = true;

        const PLAYERS = world.getPlayers();
        for (const player of PLAYERS) {
            updatePlayerData(player);
        }
        isRunning = false;
    }, 1);

    // Subscribe to the entityHit event to track player clicks
    world.afterEvents.entityHitEntity.subscribe(handleEntityHit);
}

/**
 * Stop the entity hit detection system.
 */
export function stopHitReachCheck(): void {
    system.clearRun(currentRunId);
    world.afterEvents.entityHitEntity.unsubscribe(handleEntityHit);
}
