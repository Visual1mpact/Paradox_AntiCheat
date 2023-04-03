import { GameMode, Player, world } from "@minecraft/server";

export function getGamemode(player: Player): string | undefined {
    // Loop through each gamemode in the GameMode enum
    for (const gameMode of Object.values(GameMode)) {
        // Use world.getPlayers() to get an iterator of all players in the world with the same name and game mode as the given player
        const gameModePlayer = world.getPlayers({ name: player.name, gameMode }).next().value;
        // If a player is found with the given name and game mode, return the corresponding string representation of the gamemode
        if (gameModePlayer) {
            switch (gameMode) {
                case GameMode.creative:
                    return "creative";
                case GameMode.survival:
                    return "survival";
                case GameMode.adventure:
                    return "adventure";
                case GameMode.spectator:
                    return "spectator";
            }
        }
    }
    // If no matching player is found, return undefined
    return undefined;
}
