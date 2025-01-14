import { world, Player, EntityHitEntityAfterEvent } from "@minecraft/server";

/**
 * Handle the entity hit event to check if the attacker attacked themselves.
 * If so, kick the attacker from the world.
 * @param eventData - The event data containing information about the hit.
 */
function handleSelfAttack(eventData: EntityHitEntityAfterEvent): void {
    const attacker = eventData.damagingEntity;
    const victim = eventData.hitEntity;

    // Ensure both attacker and victim are players
    if (attacker instanceof Player && victim instanceof Player) {
        // Check if the attacker attacked themselves
        if (attacker.id === victim.id) {
            const reason = "Using a client to attack oneself";
            // Safely parse the bannedPlayers
            const bannedPlayers: string[] = JSON.parse((world.getDynamicProperty("bannedPlayers") as string) ?? "[]");
            bannedPlayers.push(attacker.name);
            world.setDynamicProperty("bannedPlayers", JSON.stringify(bannedPlayers));
            const dimension = world.getDimension(attacker.dimension.id);
            dimension.runCommandAsync(`kick ${attacker.name} §o§7\n\n${reason}`).catch(console.error); // Log errors if command execution fails
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
