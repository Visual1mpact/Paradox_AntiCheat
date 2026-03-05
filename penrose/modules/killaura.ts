const { Vector3Builder, Vector3Utils } = await import("../node_modules/@minecraft/math/dist/minecraft-math");
import { world, Player, system, EntityHurtBeforeEvent } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

// CONFIGURATION CONSTANTS
const MAX_ATTACKS_PER_SECOND = 14; // Maximum allowed attacks per second
const MAX_ATTACK_DISTANCE = 4.5; // Maximum attack distance (in blocks)
const MAX_ORIENTATION_DIFFERENCE = 60; // Maximum allowed angle difference (in degrees)
const BUFFER_SIZE = 20; // Buffer size for storing recent attack ticks

// PLAYER ATTACK TRACKING
const playerAttackData: Map<string, number[]> = new Map();

/**
 * Calculates the average of an array of numbers.
 */
function calculateAverage(values: number[]): number {
    return values.reduce((acc, val) => acc + val, 0) / values.length;
}

/**
 * Calculates the standard deviation of an array of numbers.
 */
function calculateStandardDeviation(values: number[], average: number): number {
    const variance = values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / values.length;
    return Math.sqrt(variance);
}

/**
 * Determines a dynamic threshold based on interval differences.
 */
function getDynamicThreshold(intervals: number[]): number {
    if (intervals.length < 2) return 1;

    const differences = intervals.slice(1).map((val, index) => val - intervals[index]);
    const avgDiff = calculateAverage(differences);
    const stdDev = calculateStandardDeviation(differences, avgDiff);

    const THRESHOLD_FACTOR = 1.5;
    return avgDiff + THRESHOLD_FACTOR * stdDev;
}

/**
 * Checks if the attacker is facing the target within a specified angle.
 */
function checkIfFacingEntity(attacker: Player, target: Player): boolean {
    const attackerDir = attacker.getViewDirection();
    const attackerVector = new Vector3Builder(attackerDir.x, attackerDir.y, attackerDir.z);
    const targetVector = new Vector3Builder(target.location.x - attacker.location.x, target.location.y - attacker.location.y, target.location.z - attacker.location.z).normalize();

    const dot = Vector3Utils.dot(attackerVector, targetVector);
    const angle = Math.acos(dot) * (180 / Math.PI);
    return angle <= MAX_ORIENTATION_DIFFERENCE;
}

/**
 * Analyzes recent attack times for suspicious patterns.
 */
function isSuspiciousAttackPattern(attackTimes: number[]): boolean {
    if (attackTimes.length < 3) return false;

    const intervals = attackTimes.slice(1).map((t, i) => t - attackTimes[i]);
    const intervalDiffs = intervals.slice(1).map((v, i) => v - intervals[i]);
    const threshold = getDynamicThreshold(intervals);

    return intervalDiffs.every((diff) => Math.abs(diff) <= threshold);
}

/**
 * Notify Level 4 staff of a suspicious killaura attempt.
 */
function alertStaff(attacker: Player, distance: number, recentAttacks: number) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s.id === attacker.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[KillAura] §f${attacker.name} §7suspicious attack: ${recentAttacks} hits, distance ${distance.toFixed(2)}`);
    }
}

/**
 * Pre-damage handler for detecting killaura or reach exploits.
 */
function handleHurtEvent(event: EntityHurtBeforeEvent) {
    const attacker = event.damageSource.damagingEntity;
    const target = event.hurtEntity;

    // Only track Player vs Player
    if (!(attacker instanceof Player) || !(target instanceof Player)) return;

    const attackerLocation = new Vector3Builder(attacker.location.x, attacker.location.y, attacker.location.z);
    const targetLocation = new Vector3Builder(target.location.x, target.location.y, target.location.z);
    const distance = Vector3Utils.distance(attackerLocation, targetLocation);

    if (distance < 2) return;

    const currentTick = system.currentTick;
    const attackerId = attacker.id;

    if (!playerAttackData.has(attackerId)) playerAttackData.set(attackerId, []);
    const attackTimes = playerAttackData.get(attackerId)!;
    attackTimes.push(currentTick);
    if (attackTimes.length > BUFFER_SIZE) attackTimes.shift();

    const recentAttacks = attackTimes.filter((t) => currentTick - t <= 20);
    const facing = checkIfFacingEntity(attacker, target);

    if (!facing || distance > MAX_ATTACK_DISTANCE || recentAttacks.length >= MAX_ATTACKS_PER_SECOND || isSuspiciousAttackPattern(attackTimes)) {
        // Cancel the attack instead of restoring health manually
        event.cancel = true;
        alertStaff(attacker, distance, recentAttacks.length);
    }
}

/**
 * Starts the killaura/reach detection system.
 */
export function startKillAuraCheck() {
    world.beforeEvents.entityHurt.subscribe(handleHurtEvent);
}

/**
 * Stops the killaura/reach detection system.
 */
export function stopKillAuraCheck() {
    world.beforeEvents.entityHurt.unsubscribe(handleHurtEvent);
}
