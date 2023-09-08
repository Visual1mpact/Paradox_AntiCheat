import { Player } from "@minecraft/server";

/**
 * PlayerManager class for managing players.
 */
export class PlayerManager {
    /**
     * Stores players by their name (normalized).
     */
    private playersByName: { [name: string]: Player } = {};

    /**
     * Stores players by their ID.
     */
    private playersById: { [id: string]: Player } = {};

    /**
     * Adds a player to the manager.
     * @param player The player to add.
     */
    addPlayer(player: Player) {
        const playerName = player.name.toLowerCase().replace(/"|\\|@/g, "");
        this.playersByName[playerName] = player;
        this.playersById[player.id] = player;
    }

    /**
     * Removes a player from the manager.
     * @param player The player to remove.
     */
    removePlayer(player: Player) {
        const playerName = player.name.toLowerCase().replace(/"|\\|@/g, "");
        delete this.playersByName[playerName];
        delete this.playersById[player.id];
    }

    /**
     * Gets a player by their name.
     * @param playerName The name of the player.
     * @returns The player with the specified name, or null if not found.
     */
    getPlayerByName(playerName: string): Player | null {
        const normalizedPlayerName = playerName.toLowerCase().replace(/"|\\|@/g, "");
        return this.playersByName[normalizedPlayerName] || null;
    }

    /**
     * Gets a player by their ID.
     * @param playerId The ID of the player.
     * @returns The player with the specified ID, or null if not found.
     */
    getPlayerById(playerId: string): Player | null {
        return this.playersById[playerId] || null;
    }

    /**
     * Gets an array of all players, sorted by name.
     * @returns An array of all players.
     */
    getAllPlayersByName(): Player[] {
        return Object.values(this.playersByName);
    }

    /**
     * Gets an array of all players, sorted by ID.
     * @returns An array of all players.
     */
    getAllPlayersById(): Player[] {
        return Object.values(this.playersById);
    }
}
