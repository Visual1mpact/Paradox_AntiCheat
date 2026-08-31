import { EventCoordinator } from "../classes/core/event-coordinator";
import { refreshGlobalBanCache, isGloballyBanned } from "../data/ban-manager";

/**
 * Registers the global ban check to run automatically on player join.
 */
export function initializeGlobalBanCheck(): void {
    // Perform the initial load into memory
    refreshGlobalBanCache();

    // We use playerSpawn (after) to ensure the player object is fully valid in the world
    EventCoordinator.subscribeAfter("playerSpawn", (event) => {
        // initialSpawn is true only when the player first joins the session
        if (!event.initialSpawn) return;

        const { player } = event;
        // O(1) lookup against the isolated ban manager cache
        if (isGloballyBanned(player.name)) {
            // Kick the player immediately with a custom message
            player.runCommand(`kick @s You are globally banned.`);
        }
    });
}
