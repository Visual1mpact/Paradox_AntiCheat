import { GameMode, Player } from "@minecraft/server";
import { Command } from "../../classes/CommandHandler";

export const vanishCommand: Command = {
    name: "vanish",
    description: "Turns the player invisible to monitor online player's.",
    usage: "!vanish <player>",
    examples: [`!vanish`, `!vanish Player Name`, `!vanish "Player Name"`, `!vanish help`],
    execute: (message, args, minecraftEnvironment) => {
        // Retrieve the world and system from the Minecraft environment
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();
        const gameMode = minecraftEnvironment.getGameMode();

        const playerPerms = message.sender.getDynamicProperty(`__${message.sender.id}`);
        const worldPerms = world.getDynamicProperty(`__${message.sender.id}`);

        // Check if the player has permissions to execute the command
        if (!worldPerms || worldPerms !== playerPerms) {
            message.sender.sendMessage("§o§7You do not have permissions.");
            return;
        }

        // Check if player argument is provided
        let player: Player | undefined = undefined;
        const playerName = args.join(" ").trim();

        if (playerName.length > 0) {
            // Find the player object in the world
            player = world.getAllPlayers().find((playerObject) => playerObject.name === playerName);
        }

        // If no player name is provided or player not found, default to message sender
        if (!player && playerName.length === 0) {
            player = message.sender;
        }

        // Inform if the player is not found
        if (!player) {
            message.sender.sendMessage(`§o§7Player "${playerName}" not found.`);
            return;
        }

        system.run(() => {
            if (player && player.isValid()) {
                // Get the player's current game mode
                const playerGameMode = player.getGameMode();

                // Determine if messages should be sent (when playerName is provided and doesn't match player.name)
                const shouldSendMessages = playerName && playerName !== player.name;

                if (playerGameMode !== gameMode.spectator) {
                    // Set the player's game mode to spectator and backup the previous game mode
                    player.setDynamicProperty("GameModeBackup", playerGameMode);
                    player.setGameMode(gameMode.spectator);

                    // Send message indicating that vanish is enabled for the player
                    player.sendMessage(`§o§7Vanish enabled!`);

                    // If playerName is provided and doesn't match the name of the player, send a message to the command sender as well
                    if (shouldSendMessages) {
                        message.sender.sendMessage(`§o§7Vanish enabled!`);
                    }
                } else {
                    // Restore the player's previous game mode
                    const backupGameMode = player.getDynamicProperty("GameModeBackup");
                    player.setGameMode(backupGameMode as GameMode);
                    player.setDynamicProperty("GameModeBackup", undefined);

                    // Send message indicating that vanish is disabled for the player
                    player.sendMessage(`§o§7Vanish disabled!`);

                    // If playerName is provided and doesn't match the name of the player, send a message to the command sender as well
                    if (shouldSendMessages) {
                        message.sender.sendMessage(`§o§7Vanish disabled!`);
                    }
                }
            }
        });
    },
};
