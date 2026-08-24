import { Player, EntityHurtBeforeEvent, GameMode } from "@minecraft/server";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";
import { FlagManager } from "../classes/logging/flag-manager";

/**
 * Minimum height a player should be off the ground to be considered
 * legitimately "falling" for a critical hit. Normal jumps are ~1.2 blocks.
 * Packet crits usually stay below 0.5 blocks.
 */
const MIN_CRIT_HEIGHT = 0.55;

/**
 * Distributes an in-game alert notification to all active staff players
 * possessing Security Clearance Level 4 when a Criticals violation occurs.
 *
 * @param {Player} attacker - The player flagged for a Packet-Crit.
 * @param {number} yVelocity - The attacker's vertical velocity when flagged.
 */
function alertStaff(attacker: Player, yVelocity: number): void {
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    FlagManager.logFlag(attacker, "Criticals", `Player flagged for Packet-Crits (Y-Vel: ${yVelocity.toFixed(3)})`);
    for (const s of staff) {
        if (!s.isValid || s.id === attacker.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[Criticals] §f${attacker.name} §7flagged for Packet-Crits (Y-Vel: ${yVelocity.toFixed(3)})`);
    }
}

/**
 * Monitors players for "Packet Criticals" where they manipulate their
 * on-ground state to force critical hits without jumping naturally.
 */
function handleHurtEvent(event: EntityHurtBeforeEvent) {
    const attacker = event.damageSource.damagingEntity;

    if (!(attacker instanceof Player)) return;

    // Creative and Spectator modes have different flight/ground rules
    const gm = attacker.getGameMode();
    if (gm === GameMode.Creative || gm === GameMode.Spectator) return;

    // Retrieve cached transform/location data
    const transform = PlayerLocationCache.getTransform(attacker);
    const loc = transform?.location ?? attacker.location;
    const dimension = transform?.dimension ?? attacker.dimension;

    // If the player claims to be airborne (isOnGround = false)
    if (!attacker.isOnGround) {
        const velocity = attacker.getVelocity();

        // Exclude legitimate airborne states
        if (attacker.isGliding || attacker.isClimbing || attacker.isInWater) return;

        // Check the block directly beneath the player using cached dimension & location
        const blockBelow = dimension.getBlock({
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
            attacker.teleport(loc, { checkForBlocks: true });

            alertStaff(attacker, velocity.y);
        }
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
