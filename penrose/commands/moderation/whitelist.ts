import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent } from "@minecraft/server";
import { MinecraftEnvironment } from "../../classes/container/dependencies";

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
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance providing access to world and other utilities.
     * @returns {void}
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment): void => {
        const world = minecraftEnvironment.getWorld();
        const dynamicProperty = "whitelistedPlayers";

        // Retrieve the whitelist from dynamic properties and parse it
        const whitelistString = world.getDynamicProperty(dynamicProperty) as string;
        let whitelistedPlayers: string[];

        try {
            whitelistedPlayers = whitelistString ? JSON.parse(whitelistString) : [];
        } catch (error) {
            message.sender.sendMessage("§cFailed to retrieve the whitelist. Please contact an admin.");
            console.error("Error parsing whitelist:", error);
            return;
        }

        // Validate the command arguments
        const action = args.shift()?.toLowerCase();
        if (!["add", "remove", "list"].includes(action)) {
            message.sender.sendMessage("§cInvalid action. Use `add`, `remove`, or `list`.");
            return;
        }

        // Handle listing all whitelisted players
        if (action === "list") {
            if (whitelistedPlayers.length === 0) {
                message.sender.sendMessage("§2[§7Paradox§2]§o§7 No players are currently whitelisted.");
            } else {
                message.sender.sendMessage("\n§2[§7Paradox§2]§o§7 Whitelisted Players:");
                whitelistedPlayers.forEach((player) => {
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

        // Handle adding a player to the whitelist
        if (action === "add") {
            if (whitelistedPlayers.includes(playerName)) {
                message.sender.sendMessage(`§cPlayer "${playerName}" is already in the whitelist.`);
                return;
            }

            whitelistedPlayers.push(playerName);
            world.setDynamicProperty(dynamicProperty, JSON.stringify(whitelistedPlayers));
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}" has been added to the whitelist.`);
        }

        // Handle removing a player from the whitelist
        if (action === "remove") {
            if (!whitelistedPlayers.includes(playerName)) {
                message.sender.sendMessage(`§cPlayer "${playerName}" is not in the whitelist.`);
                return;
            }

            whitelistedPlayers = whitelistedPlayers.filter((player) => player !== playerName);
            world.setDynamicProperty(dynamicProperty, JSON.stringify(whitelistedPlayers));
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}" has been removed from the whitelist.`);
        }
    },
};
