import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent } from "@minecraft/server";
import { whitelistDB } from "../../event-listeners/world-initialize";

// Define the whitelist command
export const whitelistCommand: Command = {
    name: "whitelist",
    description: "Manage the whitelist by adding or removing a player, or list all whitelisted players.",
    usage: "{prefix}whitelist <add|remove|list> <player>",
    examples: [`{prefix}whitelist add Steve`, `{prefix}whitelist remove Steve`, `{prefix}whitelist list`],
    category: "Moderation",
    securityClearance: 3,
    icon: "textures/ui/multiplayer_glyph_color.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Whitelist Management",
        description: "Manage the server whitelist. You can add, remove, or list players.\n\n",
        actions: [
            {
                name: "Add Player",
                command: ["add"],
                description: "Add a player to the whitelist.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/FriendsDiversity.png",
            },
            {
                name: "Remove Player",
                command: ["remove"],
                description: "Remove a player from the whitelist.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/friend_glyph_desaturated.png",
            },
            {
                name: "List Whitelisted Players",
                command: ["list"],
                description: "View all players currently on the whitelist.",
                icon: "textures/ui/multiselection.png",
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
     * Executes the whitelist command.
     * @param {ChatSendBeforeEvent} message - The message object containing information about the command execution context.
     * @param {string[]} args - The command arguments, where the first element specifies the action and the second (optional) is the player name.
     * @returns {void}
     */
    execute: (message: ChatSendBeforeEvent, args: string[]): void => {
        const whitelistedPlayers = whitelistDB.get<string[]>("players") ?? [];

        const action = args.shift()?.toLowerCase();
        if (!["add", "remove", "list"].includes(action)) {
            message.sender.sendMessage("§cInvalid action. Use `add`, `remove`, or `list`.");
            return;
        }

        if (action === "list") {
            if (whitelistedPlayers.length === 0) {
                message.sender.sendMessage("§2[§7Paradox§2]§o§7 No players are currently whitelisted.");
            } else {
                message.sender.sendMessage("\n§2[§7Paradox§2]§o§7 Whitelisted Players:");
                whitelistedPlayers.forEach((p) => message.sender.sendMessage(` §o§7| [§f${p}§7]`));
            }
            return;
        }

        const playerName = args.join(" ").trim().replace(/["@]/g, "");
        if (!playerName) {
            message.sender.sendMessage("§cPlease provide a valid player name.");
            return;
        }

        if (action === "add") {
            if (whitelistedPlayers.includes(playerName)) {
                message.sender.sendMessage(`§cPlayer "${playerName}" is already in the whitelist.`);
                return;
            }

            whitelistedPlayers.push(playerName);
            whitelistDB.set("players", whitelistedPlayers);
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}" has been added to the whitelist.`);
        }

        if (action === "remove") {
            if (!whitelistedPlayers.includes(playerName)) {
                message.sender.sendMessage(`§cPlayer "${playerName}" is not in the whitelist.`);
                return;
            }

            whitelistDB.set(
                "players",
                whitelistedPlayers.filter((p) => p !== playerName)
            );
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}" has been removed from the whitelist.`);
        }
    },
};
