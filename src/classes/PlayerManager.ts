import { Player, world } from "@minecraft/server";

/**
 * PlayerManager class for managing players.
 */
export class PlayerManager {
    /**
     * Gets a player by their name.
     * @param playerName The name of the player.
     * @returns The player with the specified name, or null if not found.
     */
    public static getPlayerByName(playerName: string): Player | null {
        const players = world.getPlayers();
        for (const player of players) {
            if (player.name.toLowerCase().replace(/"|\\|@/g, "") === playerName.toLowerCase().replace(/"|\\|@/g, "")) {
                return player;
            }
        }
        return null;
    }

    /**
     * Gets a player by their ID.
     * @param playerId The ID of the player.
     * @returns The player with the specified ID, or null if not found.
     */
    public static getPlayerById(playerId: string): Player | null {
        const players = world.getPlayers();
        for (const player of players) {
            if (player.id === playerId) {
                return player;
            }
        }
        return null;
    }
}
