import { Player, EntityHurtBeforeEvent, GameMode } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { EventCoordinator } from "../classes/event-coordinator";

/**
 * Minimum height a player should be off the ground to be considered
 * legitimately "falling" for a critical hit. Normal jumps are ~1.2 blocks.
 * Packet crits usually stay below 0.5 blocks.
 */
const MIN_CRIT_HEIGHT = 0.55;

/**
 * Monitors players for "Packet Criticals" where they manipulate their
 * on-ground state to force critical hits without jumping naturally.
 */
async function handleHurtEvent(event: EntityHurtBeforeEvent) {
    const attacker = event.damageSource.damagingEntity;

    // Check if module is enabled in database
    const isEnabled = (await paradoxModulesDB.get("criticalsCheck_b"))?.enabled ?? false;
    if (!isEnabled) return;

    if (!(attacker instanceof Player)) return;

    // Creative and Spectator modes have different flight/ground rules
    const gm = attacker.getGameMode();
    if (gm === GameMode.Creative || gm === GameMode.Spectator) return;

    // If the player claims to be airborne (isOnGround = false)
    if (!attacker.isOnGround) {
        const velocity = attacker.getVelocity();
        const loc = attacker.location;

        // Exclude legitimate airborne states
        if (attacker.isGliding || attacker.isClimbing || attacker.isInWater) return;

        // Check the block directly beneath the player
        // We check a distance slightly below the player to see if they are "fake" airborne
        const blockBelow = attacker.dimension.getBlock({
            x: loc.x,
            y: loc.y - MIN_CRIT_HEIGHT,
            z: loc.z,
        });

        /**
         * DETECTION LOGIC:
         * If a player is "airborne" but there is a solid block within the forbidden
         * mini-jump zone (0.1 - 0.5 blocks) AND they are not actually falling
         * (velocity.y >= 0), it's a forced packet critical hit.
         */
        if (blockBelow && blockBelow.isSolid && velocity.y >= 0) {
            event.damage = 0;

            // Teleport them back to ground to break the cheat loop
            attacker.teleport(attacker.location, { checkForBlocks: true });

            alertStaff(attacker, velocity.y);
        }
    }
}

/**
 * Notify staff about the Criticals violation.
 */
function alertStaff(attacker: Player, yVelocity: number) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s.id === attacker.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Criticals] §f${attacker.name} §7flagged for Packet-Crits (Y-Vel: ${yVelocity.toFixed(3)})`);
    }
}

/**
 * Starts the Criticals detection module.
 */
export function startCriticalsCheck(): void {
    EventCoordinator.subscribeBefore("entityHurt", handleHurtEvent);
}

/**
 * Stops the Criticals detection module.
 */
export function stopCriticalsCheck(): void {
    EventCoordinator.unsubscribeBefore("entityHurt", handleHurtEvent);
}
