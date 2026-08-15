import { banlistDB } from "../../event-listeners/world-initialize";
import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { refreshGlobalBanCache } from "../../event-listeners/global-ban-listener";

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
        description:
            "Unban a player from the local or global ban list.\n\n" +
            "§7• Enter the name of the player to remove from the ban list.\n" +
            "§7• Toggle 'Global Unban' to remove the player from all worlds.\n" +
            "§7• Only administrators with sufficient clearance can perform this action.\n\n",
        commandOrder: "arg-command",
        actions: [
            {
                name: "Unban a Player",
                description: "Select a player to unban and specify whether the unban is global.",
                requiredFields: ["unbanTarget"],
                generateModalForm: true,
                icon: "textures/ui/hammer_r_disabled.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nEnter Player to Unban:",
                type: "text",
                placeholder: "Redemption awaits...",
                requiredFields: ["unbanTarget"],
            },
            {
                name: "\nGlobal Unban (optional):",
                arg: "--global",
                type: "toggle",
                requiredFields: ["unbanTarget"],
            },
        ],
    },

    /**
     * Executes the unban command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object containing information about the command execution context.
     * @param {string[]} args - The command arguments, where the first element should be the player name to unban.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const global = args.includes("--global") || args.includes("-g");
        const filteredArgs = args.filter((arg) => !["--global", "-g"].includes(arg));
        const playerName = filteredArgs.join(" ").trim().replace(/["@]/g, "");

        if (!playerName) {
            message.sender.sendMessage("§o§c[Paradox] Please provide a valid player name.");
            return;
        }

        let bannedPlayers: Record<string, any>;

        try {
            if (global) {
                // Handle global ban list from dynamic property
                const globalBanStr = world.getDynamicProperty("globalBannedPlayers") as string;
                const parsed = globalBanStr ? JSON.parse(globalBanStr) : [];
                bannedPlayers = Object.fromEntries(parsed.map((name: string) => [name, {}])); // Dummy structure
            } else {
                bannedPlayers = (await banlistDB.get("players")) ?? {};
            }
        } catch (err) {
            message.sender.sendMessage("§o§c[Paradox] Failed to retrieve the ban list. Please contact an admin.");
            console.error("[Paradox] Unban parsing error:", err);
            return;
        }

        const playerExists = playerName in bannedPlayers;

        if (!playerExists) {
            message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" is not in the ${global ? "global" : "local"} ban list.`);
            return;
        }

        // Remove the player
        delete bannedPlayers[playerName];

        if (global) {
            // Save as array again
            const newList = Object.keys(bannedPlayers);
            world.setDynamicProperty("globalBannedPlayers", JSON.stringify(newList));
            // Invalidate the cache so the change is reflected immediately
            refreshGlobalBanCache();
        } else {
            await banlistDB.set("players", bannedPlayers);
        }

        message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}§7" has been unbanned from the ${global ? "global" : "local"} ban list.`);
    },
};
