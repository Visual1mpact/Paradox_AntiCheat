import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent, world } from "@minecraft/server";

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
        const dynamicProperty = "allowlistedPlayers";

        // Retrieve the allowlist from dynamic properties and parse it
        const allowlistString = world.getDynamicProperty(dynamicProperty) as string;
        let allowlistedPlayers: string[];

        try {
            allowlistedPlayers = allowlistString ? JSON.parse(allowlistString) : [];
        } catch (error) {
            message.sender.sendMessage("§cFailed to retrieve the allowlist. Please contact an admin.");
            console.error("Error parsing allowlist:", error);
            return;
        }

        // Validate the command arguments
        const action = args.shift()?.toLowerCase();
        if (!["add", "remove", "list", "disable"].includes(action)) {
            message.sender.sendMessage("§cInvalid action. Use `add`, `remove`, or `list`.");
            return;
        }
        //Handle disabling the allowlist
        if (action === "disable") {
            world.setDynamicProperty(dynamicProperty, "");
            return;
        }

        // Handle listing all allowlisted players
        if (action === "list") {
            if (allowlistedPlayers.length === 0) {
                message.sender.sendMessage("§2[§7Paradox§2]§o§7 No players are currently allowlisted.");
            } else {
                message.sender.sendMessage("\n§2[§7Paradox§2]§o§7 allowlisted Players:");
                allowlistedPlayers.forEach((player) => {
                    message.sender.sendMessage(` §o§7| [§f${player}§7]`);
                });
            }
            return;
        }

        // Extract player name for add/remove actions
        const playerName = args.join(" ").trim().replace(/["@]/g, "");
        if (!playerName) {
            message.sender.sendMessage("§cPlease provide a valid player name.");
            return;
        }

        // Handle adding a player to the allowlist
        if (action === "add") {
            if (allowlistedPlayers.includes(playerName)) {
                message.sender.sendMessage(`§cPlayer "${playerName}" is already in the allowlist.`);
                return;
            }

            allowlistedPlayers.push(playerName);
            world.setDynamicProperty(dynamicProperty, JSON.stringify(allowlistedPlayers));
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}" has been added to the allowlist.`);
        }

        // Handle removing a player from the allowlist
        if (action === "remove") {
            if (!allowlistedPlayers.includes(playerName)) {
                message.sender.sendMessage(`§cPlayer "${playerName}" is not in the allowlist.`);
                return;
            }

            allowlistedPlayers = allowlistedPlayers.filter((player) => player !== playerName);
            world.setDynamicProperty(dynamicProperty, JSON.stringify(allowlistedPlayers));
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}" has been removed from the allowlist.`);
        }
    },
};
