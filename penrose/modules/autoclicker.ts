import { Player, EntityHurtBeforeEvent, system } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { EventCoordinator } from "../classes/event-coordinator";

// CONFIGURATION
const MAX_CPS = 14; // Maximum allowed clicks per second
const TICKS_PER_SECOND = 20; // Number of ticks in one second
const CLICK_HISTORY_SIZE = 100; // Maximum click history stored

// PLAYER CLICK TRACKING
interface Click {
    tick: number;
}

interface PlayerWithClicks extends Player {
    clicks?: Click[];
}

/**
 * Calculate CPS for a player over the last second
 */
function calculateClicksPerSecond(player: PlayerWithClicks): number {
    const currentTick = system.currentTick;
    const clicks = player.clicks ?? [];
    return clicks.filter((c) => currentTick - c.tick < TICKS_PER_SECOND).length;
}

/**
 * Notify Level 4 staff of an autoclicker violation
 */
function alertStaff(attacker: PlayerWithClicks, cps: number) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s.id === attacker.id) continue; // skip attacker if they are staff
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[AutoClicker] §f${attacker.name} §7exceeded CPS limit: §e${cps} CPS`);
    }
}

/**
 * Handle the CPS check before damage is applied
 */
function handleHurtEvent(event: EntityHurtBeforeEvent) {
    const { damageSource, hurtEntity: victim } = event;

    if (!(damageSource.damagingEntity instanceof Player) || !(victim instanceof Player)) return;

    const attacker = damageSource.damagingEntity as PlayerWithClicks;

    // Update attacker's click history
    const currentTick = system.currentTick;
    if (!attacker.clicks) attacker.clicks = [];
    attacker.clicks.unshift({ tick: currentTick });

    // Trim history
    if (attacker.clicks.length > CLICK_HISTORY_SIZE) attacker.clicks.pop();

    // Calculate CPS
    const cps = calculateClicksPerSecond(attacker);

    if (cps > MAX_CPS) {
        // Cancel damage
        event.cancel = true;

        // Notify staff only
        alertStaff(attacker, cps);
    }
}

/**
 * START / STOP
 */
export function startAutoClicker(): void {
    EventCoordinator.subscribeBefore("entityHurt", handleHurtEvent);
}

export function stopAutoClicker(): void {
    EventCoordinator.unsubscribeBefore("entityHurt", handleHurtEvent);
}
