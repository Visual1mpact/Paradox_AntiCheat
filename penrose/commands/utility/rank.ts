import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";

/**
 * Represents the rank command.
 */
export const setRankCommand: Command = {
    name: "setrank",
    description: "Sets or resets the chat rank for a player.",
    usage: "{prefix}setrank [ -t | --target <player> ] [ -r | --rank <rank> ] [ --reset ]",
    examples: [
        `{prefix}setrank -t PlayerName -r [Admin]`,
        `{prefix}setrank --target PlayerName --rank [Member]`,
        `{prefix}setrank -r [Admin] -t PlayerName`,
        `{prefix}setrank --rank [Member] --target PlayerName`,
        `{prefix}setrank -t PlayerName --reset`,
        `{prefix}setrank --target PlayerName --reset`,
    ],
    guiInstructions: {
        formType: "ActionFormData",
        title: "Set or Reset Rank",
        description: "Set or reset a player's chat rank.",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Set Rank",
                command: undefined,
                requiredFields: ["Player Name", "Rank"],
                crypto: false,
            },
            {
                name: "Reset Rank",
                command: ["--reset"],
                requiredFields: ["Player Name"],
                crypto: false,
            },
        ],
        dynamicFields: [
            {
                type: "dropdown",
                name: "Player Name",
                placeholder: "Select player's name",
                arg: "--target",
            },
            {
                type: "text",
                name: "Rank",
                placeholder: "Input rank here",
                arg: "--rank",
            },
        ],
    },
    category: "Utility",
    securityClearance: 3,

    /**
     * Executes the setrank command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();

        // Initialize variables for player name, rank, and reset flag
        let playerName = "";
        let rank = "";
        let reset = false;

        // Define valid flags
        const validFlags = new Set(["-t", "--target", "-r", "--rank", "--reset"]);

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
                case "--target":
                    playerName = captureMultiWordArgument(args);
                    break;
                case "-r":
                case "--rank":
                    rank = captureMultiWordArgument(args);
                    break;
                case "--reset":
                    reset = true;
                    break;
            }
        }

        // Check if player name is provided
        if (!playerName) {
            const prefix = world.getDynamicProperty("__prefix") ?? "!";
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${prefix}setrank -t <player> [-r <rank> | --reset]`);
            return;
        }

        // Find the player object in the world
        const player = world.getPlayers().find((playerObject) => playerObject.name === playerName);

        // If player not found, inform the sender
        if (!player) {
            message.sender.sendMessage(`§cPlayer "${playerName}" not found.`);
            return;
        }

        if (reset) {
            // Remove the player's chat rank
            player.setDynamicProperty("chatRank", undefined);

            // Inform the sender and the target player about the rank reset
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Chat rank for player "${player.name}" has been reset.`);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Your chat rank has been reset by "${message.sender.name}".`);
        } else {
            // Check if rank is provided
            if (!rank) {
                const prefix = world.getDynamicProperty("__prefix") ?? "!";
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${prefix}setrank -t <player> -r <rank> | --reset`);
                return;
            }

            // Update the player's chat rank
            player.setDynamicProperty("chatRank", rank);

            // Inform the sender and the target player about the rank update
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Chat rank for player "${player.name}" has been set to ${rank}.`);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Your chat rank has been set to ${rank} by "${message.sender.name}".`);
        }
    },
};
