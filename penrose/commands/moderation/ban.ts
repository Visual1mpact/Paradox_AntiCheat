import { banlistDB, whitelistDB } from "../../event-listeners/world-initialize";
import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent, world } from "@minecraft/server";

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
        commandOrder: "arg-command",
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
                name: "\nSelect Players Name:",
                arg: "--target",
                type: "dropdown",
                sourceType: "players",
                requiredFields: ["playerName"],
            },
            {
                name: "\nReason For Ban:",
                arg: "--reason",
                type: "text",
                placeholder: "Optional reason for banning",
                requiredFields: ["playerName"],
            },
        ],
    },

    /**
     * Executes the ban command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        // Load ban and whitelist records, defaulting to empty objects if not found
        const bannedPlayers = (banlistDB.get("players") ?? {}) as Record<string, any>;
        const whitelistedPlayers = (whitelistDB.get("players") ?? {}) as Record<string, any>;

        // Handle the list command first
        if (args.includes("-l") || args.includes("--list")) {
            const names = Object.keys(bannedPlayers);
            if (names.length > 0) {
                message.sender.sendMessage("\n§2[§7Paradox§2]§o§7 Banned Players:");
                names.forEach((name) => {
                    const reason = bannedPlayers[name]?.reason ?? "No reason";
                    message.sender.sendMessage(` §o§7| [§f${name}§7] - §8${reason}`);
                });
            } else {
                message.sender.sendMessage("§2[§7Paradox§2]§o§7 No players are currently banned.");
            }
            return;
        }

        // Argument parsing setup
        let playerName = "";
        let reason = "No reason provided.";

        const validFlags = new Set(["-t", "--target", "-r", "--reason"]);

        /**
         * Helper function to parse multi-word arguments after a flag.
         * Stops collecting words when it encounters another flag.
         */
        const captureMultiWordArgument = (args: string[]): string => {
            let result = "";
            while (args.length > 0 && !validFlags.has(args[0])) {
                result += (result ? " " : "") + args.shift();
            }
            return result.replace(/["@]/g, "");
        };

        // Parse all flags and their values
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
                    reason = captureMultiWordArgument(args);
                    break;
                }
            }
        }

        // Ensure a player name was provided
        if (!playerName) {
            message.sender.sendMessage("§o§c[Paradox] Please provide a player name using the -t or --target flag.");
            return;
        }

        // Prevent banning players on the whitelist
        if (whitelistedPlayers[playerName]) {
            message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" is whitelisted and cannot be banned.`);
            return;
        }

        /**
         * Looks up an online player by name.
         */
        const getPlayerObject = (name: string) => world.getAllPlayers().find((p) => p.name === name);

        /**
         * Returns the security clearance level of the player, if known.
         */
        const getPlayerSecurityClearance = (playerName: string) => {
            const player = getPlayerObject(playerName);
            return player ? (player.getDynamicProperty("securityClearance") as number) : undefined;
        };

        /**
         * Bans the player, stores reason, and optionally kicks if online.
         */
        const banPlayer = async (name: string) => {
            const targetPlayer = getPlayerObject(name);
            const clearance = getPlayerSecurityClearance(name);

            if (clearance === 4) {
                message.sender.sendMessage(`§o§c[Paradox] You cannot ban player "${name}§c" as they have the highest security clearance.`);
                return;
            }

            if (!bannedPlayers[name]) {
                bannedPlayers[name] = {
                    reason,
                    bannedBy: message.sender.name,
                    timestamp: Date.now(),
                };
                await banlistDB.set("players", bannedPlayers);
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${name}§7" has been added to the banned list with reason: ${reason}§7.`);
            }

            if (targetPlayer) {
                targetPlayer.runCommand(`kick @s ${reason}`);
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${name}§7" has been kicked and banned.`);
            } else {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${name}§7" will be kicked if found online.`);
            }
        };

        // Execute the ban
        banPlayer(playerName);
    },
};
