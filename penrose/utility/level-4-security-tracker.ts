import { Player } from "@minecraft/server";
import { PlayerCache } from "../classes/cache/player-cache";
import { EventCoordinator } from "../classes/event-coordinator";

// This will store players with security clearance level 4
let securityClearanceLevel4Players: Set<Player> = new Set();

/**
 * This function checks if a player has security clearance level 4.
 * @param {Player} player - The player to check.
 * @returns {boolean} - True if the player has security clearance level 4.
 */
const hasSecurityClearance4 = (player: Player): boolean => {
    return player.getDynamicProperty("securityClearance") === 4;
};

/**
 * Adds a player with security clearance 4 to the list if they aren't already in it.
 * @param {Player} player - The player to add.
 */
export const addPlayerToSecurityClearanceList = (player: Player): void => {
    // Only add the player if they have security clearance 4 and are not already in the list
    if (hasSecurityClearance4(player) && !securityClearanceLevel4Players.has(player)) {
        securityClearanceLevel4Players.add(player);
    }
};

/**
 * Removes a player from the list when they leave the world.
 * @param {Player} player - The player to remove.
 */
export const removePlayerFromSecurityClearanceList = (player: Player): void => {
    securityClearanceLevel4Players.delete(player);
};

/**
 * Initializes the tracking of players with security clearance level 4.
 * This function should be called once when your script starts.
 */
export const initializeSecurityClearanceTracking = (): void => {
    // Validation is necessary in the case of a reload with the script api
    const initialValidation = getSecurityClearanceLevel4Players();
    if (initialValidation.size === 0) {
        const players = PlayerCache.getPlayers();
        for (const player of players) {
            addPlayerToSecurityClearanceList(player);
        }
    }
    // Listen for players joining and add them if they have security clearance level 4
    EventCoordinator.subscribeAfter("playerSpawn", (event) => {
        if (!event.initialSpawn) {
            return;
        }
        const player = event.player;
        addPlayerToSecurityClearanceList(player);
    });

    // Listen for players leaving and remove them from the list
    EventCoordinator.subscribeBefore("playerLeave", (event) => {
        const player = event.player;
        removePlayerFromSecurityClearanceList(player);
    });
};

/**
 * Gets the list of all players currently online with security clearance level 4.
 * @returns {Set<Player>} - A set of players with security clearance level 4.
 */
export const getSecurityClearanceLevel4Players = (): Set<Player> => {
    return securityClearanceLevel4Players;
};
