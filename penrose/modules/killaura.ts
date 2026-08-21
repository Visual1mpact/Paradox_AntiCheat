const { Vector3Builder, Vector3Utils } = await import("../node_modules/@minecraft/math/dist/minecraft-math");
import { Player, system, EntityHurtBeforeEvent, EntityDamageCause, Vector3 } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { PlayerCache } from "../classes/cache/player-cache";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";
import { EventCoordinator } from "../classes/event-coordinator";
import { FlagManager } from "../classes/logs/flag-manager";

// CONFIGURATION CONSTANTS
const MAX_ATTACKS_PER_SECOND = 5; // Maximum allowed clicks per second
const MAX_ATTACK_DISTANCE = 4.5; // Maximum attack distance (in blocks)
const MAX_ORIENTATION_DIFFERENCE = 60; // Maximum allowed angle difference (in degrees)
const BUFFER_SIZE = 20; // Buffer size for storing recent attack ticks

// PLAYER ATTACK TRACKING
const playerAttackData: Map<string, number[]> = new Map();
/** Tracks the last target ID to detect rapid switching (Multi-Aura) */
const lastTargetTracker: Map<string, { id: string; tick: number }> = new Map();

// ADDITIONAL CONSTANTS
/** Minimum ticks between switching targets (prevents rapid multi-aura snapping) */
const MIN_SWITCH_TICKS = 2;

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
function checkIfFacingEntity(attacker: Player, attackerLoc: Vector3, targetLoc: Vector3): boolean {
    const attackerDir = attacker.getViewDirection();
    const attackerVector = new Vector3Builder(attackerDir.x, attackerDir.y, attackerDir.z);
    const targetVector = new Vector3Builder(targetLoc.x - attackerLoc.x, targetLoc.y - attackerLoc.y, targetLoc.z - attackerLoc.z).normalize();

    const dot = Vector3Utils.dot(attackerVector, targetVector);
    // clamp to valid acos domain
    const clampedDot = Math.min(1, Math.max(-1, dot));
    const angle = Math.acos(clampedDot) * (180 / Math.PI);
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
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when a suspicious attack occurs.
 *
 * @param {Player} attacker - The player attempting the attack.
 * @param {number} distance - The distance at which the attack occurred.
 * @param {number} recentAttacks - Number of recent hits within 1 second.
 */
function alertStaff(attacker: Player, distance: number, recentAttacks: number): void {
    const staff = getSecurityClearanceLevel4Players();
    FlagManager.logFlag(attacker, "KillAura", `Player flagged for suspicious attack: ${recentAttacks} hits, distance ${distance.toFixed(2)}`);
    for (const s of staff) {
        if (!s.isValid || s.id === attacker.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[KillAura] §f${attacker.name} §7suspicious attack: ${recentAttacks} hits, distance ${distance.toFixed(2)}`);
    }
}

/**
 * Pre-damage handler for detecting killaura or reach exploits.
 */
function handleHurtEvent(event: EntityHurtBeforeEvent) {
    // Only process standard melee hits
    if (event.damageSource.cause !== EntityDamageCause.entityAttack) return;

    const attacker = event.damageSource.damagingEntity;
    const target = event.hurtEntity;
    const currentTick = system.currentTick;

    // Only track Player vs Player
    if (!(attacker instanceof Player) || !(target instanceof Player)) return;

    const attackerId = attacker.id;

    // Resolve live player from PlayerCache
    const cachedAttacker = PlayerCache.getPlayerById(attackerId);
    if (!cachedAttacker) return; // attacker is gone, skip

    // Retrieve cached transform locations
    const attackerLoc = PlayerLocationCache.getTransform(attacker)?.location ?? attacker.location;
    const targetLoc = PlayerLocationCache.getTransform(target)?.location ?? target.location;

    const attackerVector = new Vector3Builder(attackerLoc.x, attackerLoc.y, attackerLoc.z);
    const targetVector = new Vector3Builder(targetLoc.x, targetLoc.y, targetLoc.z);
    const distance = Vector3Utils.distance(attackerVector, targetVector);

    if (!playerAttackData.has(attackerId)) playerAttackData.set(attackerId, []);
    const attackTimes = playerAttackData.get(attackerId)!;
    attackTimes.push(currentTick);
    if (attackTimes.length > BUFFER_SIZE) attackTimes.shift();

    // Multi-Target / Snap Detection
    const lastTarget = lastTargetTracker.get(attackerId);
    let isRapidSwitch = false;
    if (lastTarget && lastTarget.id !== target.id) {
        if (currentTick - lastTarget.tick < MIN_SWITCH_TICKS) {
            isRapidSwitch = true;
        }
    }
    lastTargetTracker.set(attackerId, { id: target.id, tick: currentTick });

    const recentAttacks = attackTimes.filter((t) => currentTick - t <= 20);

    const isCloseRange = distance < 2;
    const facing = isCloseRange || checkIfFacingEntity(attacker, attackerLoc, targetLoc);

    if (distance > MAX_ATTACK_DISTANCE || recentAttacks.length >= MAX_ATTACKS_PER_SECOND || isSuspiciousAttackPattern(attackTimes) || !facing || isRapidSwitch) {
        event.damage = 0;
        alertStaff(attacker, distance, recentAttacks.length);
    }
}

/**
 * Cleans up stored attack data when a player leaves the world.
 *
 * Without this cleanup, `playerAttackData` would retain entries for
 * players that have disconnected, causing the Map to grow indefinitely
 * over time on long-running servers.
 *
 * @param event - The playerLeave event containing the leaving player's ID.
 */
function handlePlayerLeave(event: { playerId: string }) {
    playerAttackData.delete(event.playerId);
    lastTargetTracker.delete(event.playerId);
}

/**
 * Starts the killaura/reach detection system.
 */
export function startKillAuraCheck() {
    EventCoordinator.subscribeBefore("entityHurt", handleHurtEvent);
    EventCoordinator.subscribeAfter("playerLeave", handlePlayerLeave);
}

/**
 * Stops the killaura/reach detection system.
 */
export function stopKillAuraCheck() {
    EventCoordinator.unsubscribeBefore("entityHurt", handleHurtEvent);
    EventCoordinator.unsubscribeAfter("playerLeave", handlePlayerLeave);
    playerAttackData.clear();
    lastTargetTracker.clear();
}
