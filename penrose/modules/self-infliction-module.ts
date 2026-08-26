import { Player, EntityHitEntityAfterEvent } from "@minecraft/server";
import { banlistDB } from "../event-listeners/world-initialize";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { FlagManager } from "../classes/logging/flag-manager";

/**
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when a self-attack violation occurs.
 *
 * @param {Player} attacker - The player attempting to attack themselves.
 */
function alertStaff(attacker: Player): void {
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    FlagManager.logFlag(attacker, "Self-Infliction", "Player was banned for attacking themselves.");
    for (const s of staff) {
        if (!s.isValid || s.id === attacker.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Self-Infliction] §f${attacker.name} §7was banned for attacking themselves.`);
    }
}

/**
 * Handle the entity hit event to check if the attacker attacked themselves.
 * If so, kick the attacker from the world.
 * @param eventData - The event data containing information about the hit.
 * @returns {Promise<void>}
 */
async function handleSelfAttack(eventData: EntityHitEntityAfterEvent): Promise<void> {
    const attacker = eventData.damagingEntity;
    const victim = eventData.hitEntity;

    if (!(attacker instanceof Player && victim instanceof Player)) return;
    if (attacker.id !== victim.id) return;

    alertStaff(attacker);

    const reason = "Using a client to attack oneself";
    const bannedPlayers = (await banlistDB.get("players")) ?? {};

    if (!(attacker.name in bannedPlayers)) {
        bannedPlayers[attacker.name] = {
            reason,
            bannedBy: "System",
            timestamp: Date.now(),
        };
        await banlistDB.set("players", bannedPlayers);
    }

    attacker.runCommand(`kick @s ${reason}`);
}

/**
 * Initialize the self-attack detection system.
 */
export function startSelfAttackCheck(): void {
    // Process the entity hit events
    EventCoordinator.subscribeAfter("entityHitEntity", handleSelfAttack);
}

/**
 * Stop the self-attack detection system.
 */
export function stopSelfAttackCheck(): void {
    // Process the entity hit events
    EventCoordinator.unsubscribeAfter("entityHitEntity", handleSelfAttack);
}
