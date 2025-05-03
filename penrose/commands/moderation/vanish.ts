import { GameMode, Player, ChatSendBeforeEvent, world, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";

/**
 * Represents the vanish command.
 */
export const vanishCommand: Command = {
    name: "vanish",
    description: "Turns the player invisible to monitor online players.",
    usage: "{prefix}vanish <player>",
    examples: [`{prefix}vanish`, `{prefix}vanish Player Name`, `{prefix}vanish "Player Name"`, `{prefix}vanish help`],
    category: "Moderation",
    securityClearance: 3,
    icon: "textures/ui/invisibility_effect.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Vanish Command",
        description: "Toggle vanish mode for yourself or another player.\n\n",
        actions: [
            {
                name: "Vanish Myself",
                command: undefined,
                description: "Enable or disable vanish mode for yourself.",
                icon: "textures/ui/icon_steve.png",
            },
            {
                name: "Vanish Player",
                command: undefined,
                description: "Enable or disable vanish mode for another player.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/icon_multiplayer.png",
            },
        ],
        dynamicFields: [
            {
                name: "Select A Player:",
                arg: undefined,
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerName"],
            },
        ],
    },

    /**
     * Executes the vanish command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent, args: string[]) => {
        // Check if player argument is provided
        let player: Player | undefined = undefined;
        const playerName = args.join(" ").trim().replace(/["@]/g, "");

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
            message.sender.sendMessage(`§cPlayer "${playerName}" not found.`);
            return;
        }

        system.run(() => {
            if (player && player.isValid) {
                // Get the player's current game mode
                const playerGameMode = player.getGameMode();

                // Determine if messages should be sent (when playerName is provided and doesn't match player.name)
                const shouldSendMessages = playerName && playerName !== player.name;

                if (playerGameMode !== GameMode.spectator) {
                    // Set the player's game mode to spectator and backup the previous game mode
                    player.setDynamicProperty("GameModeBackup", playerGameMode);
                    player.setGameMode(GameMode.spectator);

                    // Send message indicating that vanish is enabled for the player
                    player.sendMessage(`§2[§7Paradox§2]§o§7 Vanish enabled!`);

                    // If playerName is provided and doesn't match the name of the player, send a message to the command sender as well
                    if (shouldSendMessages) {
                        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Vanish enabled!`);
                    }
                } else {
                    // Restore the player's previous game mode
                    const backupGameMode = player.getDynamicProperty("GameModeBackup");
                    player.setGameMode(backupGameMode as GameMode);
                    player.setDynamicProperty("GameModeBackup", undefined);

                    // Send message indicating that vanish is disabled for the player
                    player.sendMessage(`§2[§7Paradox§2]§o§7 Vanish disabled!`);

                    // If playerName is provided and doesn't match the name of the player, send a message to the command sender as well
                    if (shouldSendMessages) {
                        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Vanish disabled!`);
                    }
                }
            }
        });
    },
};
