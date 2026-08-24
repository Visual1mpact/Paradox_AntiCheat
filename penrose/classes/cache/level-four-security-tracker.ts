import { Player } from "@minecraft/server";
import { PlayerCache } from "./player-cache";
import { EventCoordinator } from "../core/event-coordinator";

/**
 * Manages tracking and retrieval of online players holding level 4 security clearance.
 */
export class SecurityClearanceManager {
    /** Stores players currently verified with level 4 security clearance. */
    private static securityClearanceLevel4Players: Set<Player> = new Set();

    /** Tracks whether the manager event listeners have already been bound. */
    private static initialized = false;

    /**
     * Checks if a player has security clearance level 4.
     * @param player - The player to check.
     * @returns True if the player possesses level 4 dynamic property clearance.
     */
    public static hasSecurityClearance4(player: Player): boolean {
        return Boolean(player?.isValid && player.getDynamicProperty("securityClearance") === 4);
    }

    /**
     * Adds a player to the tracking set if they meet the clearance criteria.
     * @param player - The target player instance.
     */
    public static addPlayerToSecurityClearanceList(player: Player): void {
        if (this.hasSecurityClearance4(player) && !this.securityClearanceLevel4Players.has(player)) {
            this.securityClearanceLevel4Players.add(player);
        }
    }

    /**
     * Removes a player from the clearance list (e.g., upon world departure).
     * @param player - The target player instance.
     */
    public static removePlayerFromSecurityClearanceList(player: Player): void {
        this.securityClearanceLevel4Players.delete(player);
    }

    /**
     * Initializes the security clearance event tracking and populates existing cached players.
     * Safe to invoke multiple times without duplicating event bindings.
     */
    public static initializeSecurityClearanceTracking(): void {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        // Populate initial players from cache
        for (const player of PlayerCache.getPlayers()) {
            this.addPlayerToSecurityClearanceList(player);
        }

        // Listen for player spawning to grant level 4 status tracking
        EventCoordinator.subscribeAfter("playerSpawn", (event) => {
            if (!event.initialSpawn) {
                return;
            }
            this.addPlayerToSecurityClearanceList(event.player);
        });

        // Listen for player departure to cleanup reference
        EventCoordinator.subscribeBefore("playerLeave", (event) => {
            this.removePlayerFromSecurityClearanceList(event.player);
        });
    }

    /**
     * Returns the active set of players holding level 4 security clearance.
     * @returns Set of active level 4 clearance players.
     */
    public static getSecurityClearanceLevel4Players(): ReadonlySet<Player> {
        return this.securityClearanceLevel4Players;
    }
}
