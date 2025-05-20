import { world, Player, EntityHitEntityAfterEvent } from "@minecraft/server";
import { banlistDB } from "../event-listeners/world-initialize";

/**
 * Handle the entity hit event to check if the attacker attacked themselves.
 * If so, kick the attacker from the world.
 * @param eventData - The event data containing information about the hit.
 * @returns {Promise<void>}
 */
async function handleSelfAttack(eventData: EntityHitEntityAfterEvent): Promise<void> {
    const attacker = eventData.damagingEntity;
    const victim = eventData.hitEntity;

    // Ensure both attacker and victim are players
    if (attacker instanceof Player && victim instanceof Player) {
        // Check if the attacker attacked themselves
        if (attacker.id === victim.id) {
            const reason = "Using a client to attack oneself";
            // Safely parse the bannedPlayers
            const bannedPlayers = banlistDB.get<string[]>("players") ?? [];
            bannedPlayers.push(attacker.name);
            await banlistDB.set("players", bannedPlayers);
            attacker.runCommand(`kick @s §o§7\n\n${reason}`);
        }
    }
}

/**
 * Initialize the self-attack detection system.
 */
export function startSelfAttackCheck(): void {
    // Process the entity hit events
    world.afterEvents.entityHitEntity.subscribe(handleSelfAttack);
}

/**
 * Stop the self-attack detection system.
 */
export function stopSelfAttackCheck(): void {
    // Process the entity hit events
    world.afterEvents.entityHitEntity.unsubscribe(handleSelfAttack);
}
