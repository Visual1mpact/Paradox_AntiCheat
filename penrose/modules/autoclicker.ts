import { Player, EntityHurtBeforeEvent, system, PlayerLeaveAfterEvent } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { EventCoordinator } from "../classes/event-coordinator";
import { FlagManager } from "../classes/logs/flag-manager";

// CONFIGURATION
const MAX_CPS = 5; // Maximum allowed clicks per second
const TICKS_PER_SECOND = 20; // Number of ticks in one second
const CLICK_HISTORY_SIZE = 100; // Maximum click history stored

// PLAYER CLICK TRACKING
/** Maps player IDs to an array of click timestamps (ticks) */
const playerClickData = new Map<string, number[]>();

/**
 * Calculate CPS for a player over the last second
 */
function calculateClicksPerSecond(clicks: number[]): number {
    const currentTick = system.currentTick;
    return clicks.filter((tick) => currentTick - tick < TICKS_PER_SECOND).length;
}

/**
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when an autoclicker violation occurs.
 *
 * @param {Player} attacker - The player exceeding the CPS limit.
 * @param {number} cps - The calculated clicks per second.
 */
function alertStaff(attacker: Player, cps: number): void {
    const staff = getSecurityClearanceLevel4Players();
    FlagManager.logFlag(attacker, "AutoClicker", `Player exceeded CPS limit: ${cps} CPS.`);
    for (const s of staff) {
        if (!s.isValid || s.id === attacker.id) continue; // skip invalid entity or attacker if they are staff
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[AutoClicker] §f${attacker.name} §7exceeded CPS limit: §e${cps} CPS`);
    }
}

/**
 * Handle the CPS check before damage is applied
 */
function handleHurtEvent(event: EntityHurtBeforeEvent) {
    const { damageSource, hurtEntity: victim } = event;

    if (!(damageSource.damagingEntity instanceof Player) || !(victim instanceof Player)) return;
    const attacker = damageSource.damagingEntity;

    // Exempt high-security staff
    if ((attacker.getDynamicProperty("securityClearance") as number) === 4) return;

    // Update attacker's click history
    const currentTick = system.currentTick;
    if (!playerClickData.has(attacker.id)) {
        playerClickData.set(attacker.id, []);
    }

    const clicks = playerClickData.get(attacker.id)!;
    clicks.unshift(currentTick);

    // Trim history
    if (clicks.length > CLICK_HISTORY_SIZE) clicks.pop();

    // Calculate CPS
    const cps = calculateClicksPerSecond(clicks);

    if (cps >= MAX_CPS) {
        // Cancel damage
        event.damage = 0;

        // Notify staff only
        alertStaff(attacker, cps);
    }
}

/**
 * Cleans up stored click data when a player leaves the world.
 */
function handlePlayerLeave(event: PlayerLeaveAfterEvent) {
    playerClickData.delete(event.playerId);
}

/**
 * START / STOP
 */
export function startAutoClicker(): void {
    EventCoordinator.subscribeBefore("entityHurt", handleHurtEvent);
    EventCoordinator.subscribeAfter("playerLeave", handlePlayerLeave);
}

export function stopAutoClicker(): void {
    EventCoordinator.unsubscribeBefore("entityHurt", handleHurtEvent);
    EventCoordinator.unsubscribeAfter("playerLeave", handlePlayerLeave);
    playerClickData.clear();
}
