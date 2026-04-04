import { ChatSendBeforeEvent, Player, world } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/player-cache";

/**
 * Updates the player's nameTag based on their chat rank and the global rank setting.
 *
 * If ranks are disabled globally, the nameTag will only show the player's name.
 * Otherwise, it will prepend the player's rank (or the default rank if none is set).
 * A teleport to the player's current location is issued to force a client sync for the nameTag.
 *
 * @param {Player} player - The player whose nameTag should be updated.
 */
function updateNameTag(player: Player): void {
    const isRankDisabled = world.getDynamicProperty("globalRankDisabled") ?? false;
    const rank = (player.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";
    player.nameTag = isRankDisabled ? player.name : `${rank}§r ${player.name}`;
    player.teleport(player.location, { dimension: player.dimension }); // Force client sync
}

/**
 * Represents the rank command.
 */
export const setRankCommand: Command = {
    name: "setrank",
    description: "Sets or resets the chat rank for a player, or toggles rank functionality globally.",
    usage: "{prefix}setrank [ -t | --target <player> ] [ -r | --rank <rank> ] [ --reset ] [ -d | -e ]",
    examples: [`{prefix}setrank -t PlayerName -r [Admin]`, `{prefix}setrank -r [Member] -t PlayerName`, `{prefix}setrank -t PlayerName --reset`, `{prefix}setrank -d`, `{prefix}setrank -e`],
    icon: "textures/items/book_portfolio.png",
    securityClearance: 3,
    guiInstructions: {
        formType: "ActionFormData",
        title: "Set or Reset Rank",
        description: "Manage chat ranks for players.\n\n" + "§7• Set a player's rank.\n" + "§7• Reset a player's rank.\n" + "§7• Enable or disable ranks globally (admin only).\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Set Rank",
                securityClearance: 3,
                requiredFields: ["PlayerName", "Rank"],
                generateModalForm: true,
            },
            {
                name: "Reset Rank",
                securityClearance: 3,
                command: ["--reset"],
                requiredFields: ["PlayerName"],
                generateModalForm: true,
            },
            {
                name: "Disable Ranks Globally",
                securityClearance: 4,
                command: ["-d"],
                generateModalForm: false,
            },
            {
                name: "Enable Ranks Globally",
                securityClearance: 4,
                command: ["-e"],
                generateModalForm: false,
            },
        ],
        dynamicFields: [
            {
                type: "dropdown",
                sourceType: "players",
                name: "\nSelect Player Name:",
                arg: "--target",
                requiredFields: ["PlayerName"],
            },
            {
                type: "text",
                name: "\nInput Rank Here:",
                placeholder: "Rank",
                arg: "--rank",
                requiredFields: ["Rank"],
            },
        ],
    },
    category: "Utility",

    /**
     * Executes the setrank command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[] | undefined} args - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent | undefined, args: string[] | undefined) => {
        if (!message || !args) return;
        /**
         * Toggles global rank functionality (enable/disable).
         * @param {ChatSendBeforeEvent} message - The message object.
         * @param {number} senderClearance - The clearance level of the command sender.
         * @param {boolean} disable - Whether to disable ranks globally (true to disable, false to enable).
         */
        function toggleGlobalRanks(message: ChatSendBeforeEvent, senderClearance: number, disable: boolean): void {
            if (senderClearance < 4) {
                message.sender.sendMessage(`§o§c[Paradox] You do not have permission to perform this action.`);
                return;
            }

            world.setDynamicProperty("globalRankDisabled", disable);

            for (const player of PlayerCache.getPlayers()) {
                updateNameTag(player);
            }

            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Ranks have been ${disable ? "disabled" : "enabled"} globally.`);
        }

        // Check if the global rank setting is disabled
        const isRankDisabled = world.getDynamicProperty("globalRankDisabled") ?? false;

        const senderClearance = message.sender.getDynamicProperty("securityClearance") as number;

        // If ranks are disabled globally, prevent setting or resetting ranks
        if (isRankDisabled && senderClearance < 4) {
            message.sender.sendMessage(`§o§c[Paradox] Global rank management is currently disabled.`);
            return;
        }

        // Initialize variables for player name, rank, and reset flag
        let playerName = "";
        let rank = "";
        let reset = false;

        // Define valid flags
        const validFlags = new Set(["-t", "--target", "-r", "--rank", "--reset", "-d", "-e"]);

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

        // Check for global rank toggles before processing other arguments
        if (args.includes("-d")) {
            toggleGlobalRanks(message, senderClearance, true);
            return;
        }
        if (args.includes("-e")) {
            toggleGlobalRanks(message, senderClearance, false);
            return;
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
                case "--rank": {
                    rank = captureMultiWordArgument(args);
                    break;
                }
                case "--reset": {
                    reset = true;
                    break;
                }
            }
        }

        // Check if player name is provided for rank assignment or reset
        if (!playerName && !reset) {
            const prefix = world.getDynamicProperty("__prefix") ?? "!";
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${prefix}§7setrank -t <player> [-r <rank> | --reset]`);
            return;
        }

        // Find the player object in the world
        const player = PlayerCache.getPlayerByName(playerName);

        // If player not found, inform the sender
        if (!player) {
            message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" not found.`);
            return;
        }

        if (reset) {
            // Remove the player's chat rank
            player.setDynamicProperty("chatRank", undefined);

            updateNameTag(player);

            // Inform the sender and the target player about the rank reset
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Chat rank for player "${player.name}§7" has been reset.`);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Your chat rank has been reset by "${message.sender.name}§7".`);
        } else {
            // Check if rank is provided
            if (!rank) {
                const prefix = world.getDynamicProperty("__prefix") ?? "!";
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Usage: ${prefix}§7setrank -t <player> -r <rank> | --reset`);
                return;
            }

            // Update the player's chat rank
            player.setDynamicProperty("chatRank", rank);
            updateNameTag(player);

            // Inform the sender and the target player about the rank update
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Chat rank for player "${player.name}§7" has been set to ${rank}§7.`);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Your chat rank has been set to ${rank}§7 by "${message.sender.name}§7".`);
        }
    },
};
