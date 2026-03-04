import { ChatSendBeforeEvent, Player, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";

/**
 * Represents the kick command.
 */
export const kickCommand: Command = {
    name: "kick",
    description: "Kick the specified player from the server.",
    usage: "{prefix}kick [ -t | --target <player> ] [ -r | --reason <reason> ]",
    category: "Moderation",
    examples: [
        `{prefix}kick -t PlayerName -r "Reason for kick"`,
        `{prefix}kick --target PlayerName --reason "Reason for kick"`,
        `{prefix}kick -r "Reason for kick" -t PlayerName`,
        `{prefix}kick --reason "Reason for kick" --target PlayerName`,
        `{prefix}kick help`,
    ],
    securityClearance: 3,
    icon: "textures/items/diamond_boots.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Kick Command",
        description: "Kick a player from the server with a specified reason.\n\n",
        commandOrder: "arg-command",
        actions: [
            {
                name: "Kick Player",
                description: "Select a player to kick from the server.",
                requiredFields: ["playerName", "reason"],
                generateModalForm: true,
                icon: "textures/items/chainmail_boots.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Target Player:",
                arg: "--target",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerName"],
            },
            {
                name: "\nKick Reason:",
                arg: "--reason",
                type: "text",
                placeholder: "Enter reason for kick (optional)",
                requiredFields: ["reason"],
            },
        ],
    },

    /**
     * Executes the kick command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;
        // Initialize variables for player name and reason
        let playerName = "";
        let reason = "";

        // Define valid flags
        const validFlags = new Set(["-t", "--target", "-r", "--reason"]);

        /**
         * Captures and returns a multi-word argument from the provided array of arguments.
         * This function continues to concatenate words from the `args` array until it encounters
         * a valid flag or runs out of arguments.
         *
         * @param {string[]} args - The array of arguments to parse.
         * @returns {string} - The captured multi-word argument as a string.
         */
        function captureMultiWordArgument(args: string[]): string {
            let result = "";
            while (args.length > 0 && !validFlags.has(args[0])) {
                result += (result ? " " : "") + args.shift();
            }
            return result.replace(/["@]/g, "");
        }

        // Parse the arguments using parameter flags
        while (args.length > 0) {
            const flag = args.shift();
            switch (flag) {
                case "-t":
                case "--target": {
                    playerName = captureMultiWordArgument(args);
                    break;
                }
                case "-r":
                case "--reason": {
                    reason = captureMultiWordArgument(args) ?? "Farewell";
                    break;
                }
            }
        }

        // Find the player object in the world
        const player: Player | undefined = world.getAllPlayers().find((playerObject) => playerObject.name === playerName);

        // If player not found, inform the sender
        if (!player) {
            message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" not found.`);
            return;
        }

        if (player.isValid) {
            // Kick the player with the specified reason
            player.runCommand(`kick @s \nYOU ARE KICKED!\n\n[Kicked By]: ${message.sender.name ?? "N/A"}\n[Reason]: ${reason ?? "Farewell"}`);

            // Check if the player is still in the world
            const playerStillExists = world.getAllPlayers().find((playerObject) => playerObject.name === playerName);

            // Inform the sender about the action based on whether the player is still in the world
            if (playerStillExists) {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 ${player.name}§7 has been kicked from the server.`);
            } else {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 ${player.name}§7 has not been kicked from the server.`);
            }
        }
    },
};
