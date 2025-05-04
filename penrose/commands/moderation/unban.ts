import { banlistDB } from "../../event-listeners/world-initialize";
import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent, world } from "@minecraft/server";

// Define the unban command
export const unbanCommand: Command = {
    name: "unban",
    description: "Unban a previously banned player.",
    usage: "{prefix}unban <player> [ --global | -g ]",
    examples: [`{prefix}unban Steve`, `{prefix}unban Steve --global`],
    category: "Moderation",
    securityClearance: 3,
    icon: "textures/ui/hammer_l_disabled.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Unban Player",
        description: "Unban a player from the local or global ban list.\n\n",
        actions: [
            {
                name: "Unban a Player",
                command: undefined,
                description: "Select a player to unban and specify whether the unban is global.",
                requiredFields: ["unbanTarget"],
                generateModalForm: true,
                icon: "textures/ui/hammer_r_disabled.png",
            },
        ],
        dynamicFields: [
            {
                name: "Enter Player to Unban:",
                arg: undefined,
                type: "text",
                placeholder: "Redemption awaits...",
                requiredFields: ["unbanTarget"],
            },
            {
                name: "Global Unban (optional):",
                arg: "--global",
                type: "toggle",
                requiredFields: ["unbanTarget"],
            },
        ],
    },

    /**
     * Executes the unban command.
     * @param {ChatSendBeforeEvent} message - The message object containing information about the command execution context.
     * @param {string[]} args - The command arguments, where the first element should be the player name to unban.
     * @returns {void}
     */
    execute: (message: ChatSendBeforeEvent, args: string[]): void => {
        // Detect global unban flag
        const global = args.includes("--global") || args.includes("-g");

        // Remove flag from args so only the name remains
        const filteredArgs = args.filter((arg) => !["--global", "-g"].includes(arg));

        // Extract player name and sanitize input
        const playerName = filteredArgs.join(" ").trim().replace(/["@]/g, "");
        if (!playerName) {
            message.sender.sendMessage("§o§cPlease provide a valid player name.");
            return;
        }

        let bannedPlayers: string[];

        try {
            if (global) {
                // Fetch global banned players from dynamic property
                const globalBanStr = world.getDynamicProperty("globalBannedPlayers") as string;
                bannedPlayers = globalBanStr ? JSON.parse(globalBanStr) : [];
            } else {
                // Fetch local banned players from banlistDB
                bannedPlayers = banlistDB.get<string[]>("players") ?? [];
            }
        } catch (err) {
            message.sender.sendMessage("§o§cFailed to retrieve the ban list. Please contact an admin.");
            console.error("Unban parsing error:", err);
            return;
        }

        // If player not found in list, show error
        if (!bannedPlayers.includes(playerName)) {
            message.sender.sendMessage(`§o§cPlayer "${playerName}§c" is not in the ${global ? "global" : "local"} ban list.`);
            return;
        }

        // Remove player from the list
        bannedPlayers = bannedPlayers.filter((name) => name !== playerName);

        // Save the updated list to the appropriate source
        if (global) {
            world.setDynamicProperty("globalBannedPlayers", JSON.stringify(bannedPlayers));
        } else {
            banlistDB.set("players", bannedPlayers);
        }

        // Confirm success to the user
        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}§7" has been unbanned from the ${global ? "global" : "local"} ban list.`);
    },
};
