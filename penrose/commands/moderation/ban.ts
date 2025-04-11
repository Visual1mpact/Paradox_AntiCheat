import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent, system, world } from "@minecraft/server";

// Define the ban command
export const banCommand: Command = {
    name: "ban",
    description: "Ban a player with an optional reason or list all banned players.",
    usage: "{prefix}ban [ -t | --target <player> ] [ -r | --reason <reason> ] [ -l | --list ]",
    examples: [`{prefix}ban -t Steve`, `{prefix}ban -t Steve -r Griefing`, `{prefix}ban -t Steve Bob -r Inappropriate Behavior`, `{prefix}ban -l`],
    category: "Moderation",
    securityClearance: 3,
    icon: "textures/ui/hammer_l.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Ban Player",
        description: "Manage banned players by adding new bans or listing existing ones.\n\n",
        actions: [
            {
                name: "Ban Player(s)",
                command: undefined,
                description: "Ban the specified players with the provided reason.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/hammer_r.png",
            },
            {
                name: "List Banned Players",
                command: ["-l"],
                description: "View all players currently banned.",
                icon: "textures/ui/icon_sign.png",
            },
        ],
        dynamicFields: [
            {
                name: "Select Players Name:",
                arg: "--target",
                type: "dropdown",
                requiredFields: ["playerName"],
            },
            {
                name: "Reason:",
                arg: "--reason",
                type: "text",
                placeholder: "Optional reason for banning",
                requiredFields: ["playerName"],
            },
        ],
    },

    /**
     * Executes the ban command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent, args: string[]) => {
        // Initialize or retrieve the banned and whitelisted players lists
        let bannedPlayers: string[] = [];
        let whitelistedPlayers: string[] = [];
        const bannedPlayersString = world.getDynamicProperty("bannedPlayers") as string;
        const whitelistedPlayersString = world.getDynamicProperty("whitelistedPlayers") as string;

        try {
            bannedPlayers = bannedPlayersString ? JSON.parse(bannedPlayersString) : [];
            whitelistedPlayers = whitelistedPlayersString ? JSON.parse(whitelistedPlayersString) : [];
        } catch (error) {
            bannedPlayers = [];
            whitelistedPlayers = [];
        }

        // Check if the command is for listing banned players
        if (args.includes("-l") || args.includes("--list")) {
            if (bannedPlayers.length > 0) {
                message.sender.sendMessage("\n§2[§7Paradox§2]§o§7 Banned Players:");
                bannedPlayers.forEach((player) => {
                    message.sender.sendMessage(` §o§7| [§f${player}§7]`);
                });
            } else {
                message.sender.sendMessage("§2[§7Paradox§2]§o§7 No players are currently banned.");
            }
            return;
        }

        // Initialize variables for player name and reason
        let playerName = "";
        let reason = "No reason provided.";

        // Define valid flags
        const validFlags = new Set(["-t", "--target", "-r", "--reason"]);

        // Capture multi-word argument helper
        function captureMultiWordArgument(args: string[]): string {
            let result = "";
            while (args.length > 0 && !validFlags.has(args[0])) {
                result += (result ? " " : "") + args.shift();
            }
            return result.replace(/["@]/g, "");
        }

        // Parse the arguments
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
                    reason = captureMultiWordArgument(args) || "No reason provided.";
                    break;
                }
            }
        }

        // Abort if no player name is provided
        if (!playerName) {
            message.sender.sendMessage("§cPlease provide a player name using the -t or --target flag.");
            return;
        }

        // Abort if the player is whitelisted
        if (whitelistedPlayers.includes(playerName)) {
            message.sender.sendMessage(`§cPlayer "${playerName}" is whitelisted and cannot be banned.`);
            return;
        }

        // Function to get the player object by name
        const getPlayerObject = (name: string) => {
            return world.getAllPlayers().find((playerObject) => playerObject.name === name);
        };

        // Function to get player's security clearance
        const getPlayerSecurityClearance = (playerName: string) => {
            const player = getPlayerObject(playerName);
            return player ? (player.getDynamicProperty("securityClearance") as number) : undefined;
        };

        // Function to handle banning
        const banPlayer = (name: string) => {
            // Check if player is online
            const targetPlayer = getPlayerObject(name);
            const playerClearance = targetPlayer ? getPlayerSecurityClearance(name) : undefined;

            if (playerClearance === 4) {
                message.sender.sendMessage(`§cYou cannot ban player "${name}" as they have the highest security clearance.`);
                return;
            }

            // Add player to banned list
            if (!bannedPlayers.includes(name)) {
                bannedPlayers.push(name);
                world.setDynamicProperty("bannedPlayers", JSON.stringify(bannedPlayers));
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${name}" has been added to the banned list with reason: ${reason}.`);
                if (!targetPlayer) {
                    message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Note: The ban will be canceled if the player has high security clearance when they join.`);
                }
            }

            if (targetPlayer) {
                // If the player is online, tag and kick them
                system.run(() => {
                    const dimension = world.getDimension(targetPlayer.dimension.id);
                    dimension.runCommand(`kick "${targetPlayer.name}" §o§7\n\n${reason}`);
                });
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${name}" has been banned with reason: ${reason}`);
            }
        };

        // Proceed to ban the player
        banPlayer(playerName);
    },
};
