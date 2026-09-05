import { Command } from "../../classes/core/command-handler";
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
        description:
            "Manage the server whitelist.\n\n" + "§7• Add a player to grant them access.\n" + "§7• Remove a player to revoke access.\n" + "§7• List all whitelisted players currently on the server.\n" + "§7• Player names are case-sensitive.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Add Player",
                securityClearance: 4,
                command: ["add"],
                description: "Add a player to the whitelist.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/FriendsDiversity.png",
            },
            {
                name: "Remove Player",
                securityClearance: 4,
                command: ["remove"],
                description: "Remove a player from the whitelist.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/friend_glyph_desaturated.png",
            },
            {
                name: "List Whitelisted Players",
                securityClearance: 3,
                command: ["list"],
                description: "View all players currently on the whitelist.",
                icon: "textures/ui/multiselection.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nEnter Player Name:",
                type: "text",
                requiredFields: ["playerName"],
                placeholder: "Case Sensitive",
            },
        ],
    },

    /**
     * Executes the whitelist command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object containing information about the command execution context.
     * @param {string[]} args - The command arguments, where the first element specifies the action and the second (optional) is the player name.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const action = args.shift()?.toLowerCase();
        if (!["add", "remove", "list"].includes(action as string)) {
            message.sender.sendMessage("§o§c[Paradox] Invalid action. Use `add`, `remove`, or `list`.");
            return;
        }

        const whitelist = (await whitelistDB.get("players")) ?? {};

        if (action === "list") {
            const playerNames = Object.keys(whitelist);
            if (playerNames.length === 0) {
                message.sender.sendMessage("§2[§7Paradox§2]§o§7 No players are currently whitelisted.");
            } else {
                message.sender.sendMessage("§2[§7Paradox§2]§o§7 Whitelisted Players:");
                playerNames.forEach((name) => {
                    message.sender.sendMessage(` §o§7| [§f${name}§7]`);
                });
            }
            return;
        }

        const playerName = args.join(" ").trim().replace(/["@]/g, "");
        if (!playerName) {
            message.sender.sendMessage("§o§c[Paradox] Please provide a valid player name.");
            return;
        }

        if (action === "add") {
            if (playerName in whitelist) {
                message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" is already in the whitelist.`);
                return;
            }

            whitelist[playerName] = { id: message.sender.id }; // Save the sender's ID
            await whitelistDB.set("players", whitelist);
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}§7" has been added to the whitelist.`);
        }

        if (action === "remove") {
            if (!(playerName in whitelist)) {
                message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" is not in the whitelist.`);
                return;
            }

            delete whitelist[playerName];
            await whitelistDB.set("players", whitelist);
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}§7" has been removed from the whitelist.`);
        }
    },
};
