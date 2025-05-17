import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent } from "@minecraft/server";
import { allowlistDB } from "../../event-listeners/world-initialize";

// Define the allowlist command
export const allowlistCommand: Command = {
    name: "allowlist",
    description: "Manage the allowlist by adding or removing a player, or list all allowlisted players.",
    usage: "{prefix}allowlist <add|remove|list|disable> <player>",
    examples: [`{prefix}allowlist add Steve`, `{prefix}allowlist remove Steve`, `{prefix}allowlist list`],
    category: "Moderation",
    securityClearance: 3,
    icon: "textures/ui/multiplayer_glyph_color.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "allowlist Management",
        description: "Manage the server allowlist. You can add, remove, list players, or disable.\n\n",
        actions: [
            {
                name: "Add Player",
                command: ["add"],
                description: "Add a player to the allowlist.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/FriendsDiversity.png",
            },
            {
                name: "Remove Player",
                command: ["remove"],
                description: "Remove a player from the allowlist.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/friend_glyph_desaturated.png",
            },
            {
                name: "List allowlisted Players",
                command: ["list"],
                description: "View all players currently on the allowlist.",
                icon: "textures/ui/multiselection.png",
            },
            {
                name: "Disable the allowlist",
                command: ["disable"],
                description: "Disables the allow list and clears all configured players.",
                icon: "textures/blocks/barrier.png",
            },
        ],
        dynamicFields: [
            {
                name: "Enter Player Name:",
                arg: undefined,
                type: "text",
                requiredFields: ["playerName"],
            },
        ],
    },

    /**
     * Executes the allowlist command.
     * @param {ChatSendBeforeEvent} message - The message object containing information about the command execution context.
     * @param {string[]} args - The command arguments, where the first element specifies the action and the second (optional) is the player name.
     * @returns {void}
     */
    execute: (message: ChatSendBeforeEvent, args: string[]): void => {
        const allowlistedPlayers = allowlistDB.get<string[]>("players") ?? [];

        const action = args.shift()?.toLowerCase();
        if (!["add", "remove", "list", "disable"].includes(action)) {
            message.sender.sendMessage("§o§c[Paradox] Invalid action. Use `add`, `remove`, `list`, or `disable`.");
            return;
        }

        if (action === "disable") {
            allowlistDB.delete("players");
            message.sender.sendMessage("§2[§7Paradox§2]§o§7 The allowlist has been disabled and cleared.");
            return;
        }

        if (action === "list") {
            if (allowlistedPlayers.length === 0) {
                message.sender.sendMessage("§2[§7Paradox§2]§o§7 No players are currently allowlisted.");
            } else {
                message.sender.sendMessage("\n§2[§7Paradox§2]§o§7 Allowlisted Players:");
                allowlistedPlayers.forEach((p) => message.sender.sendMessage(` §o§7| [§f${p}§7]`));
            }
            return;
        }

        const playerName = args.join(" ").trim().replace(/["@]/g, "");
        if (!playerName) {
            message.sender.sendMessage("§o§c[Paradox] Please provide a valid player name.");
            return;
        }

        if (action === "add") {
            if (allowlistedPlayers.includes(playerName)) {
                message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" is already in the allowlist.`);
                return;
            }

            allowlistedPlayers.push(playerName);
            allowlistDB.set("players", allowlistedPlayers);
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}§7" has been added to the allowlist.`);
        }

        if (action === "remove") {
            if (!allowlistedPlayers.includes(playerName)) {
                message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" is not in the allowlist.`);
                return;
            }

            allowlistDB.set(
                "players",
                allowlistedPlayers.filter((p) => p !== playerName)
            );
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}§7" has been removed from the allowlist.`);
        }
    },
};
