import { Command } from "../../classes/core/command-handler";
import { ChatSendBeforeEvent, world } from "@minecraft/server";
import { allowlistDB } from "../../event-listeners/world-initialize";

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
        title: "Allowlist Management",
        description:
            "Manage the server allowlist to control which players can join.\n\n" +
            "§7• §fAdd Player§7: Add a player to the allowlist so they can join the server.\n" +
            "§7• §fRemove Player§7: Remove a player from the allowlist, preventing them from joining.\n" +
            "§7• §fList Players§7: View all players currently on the allowlist.\n" +
            "§7• §fDisable Allowlist§7: Turn off the allowlist and clear all entries.\n\n" +
            "§7Allowlist Rules:\n" +
            "§7• Only administrators with sufficient clearance can manage the allowlist.\n" +
            "§7• Player names are case sensitive and must be entered accurately.\n" +
            "§7• All allowlist actions are logged for administrative review.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Add Player",
                securityClearance: 4,
                command: ["add"],
                description: "Add a player to the allowlist.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/FriendsDiversity.png",
            },
            {
                name: "Remove Player",
                securityClearance: 4,
                command: ["remove"],
                description: "Remove a player from the allowlist.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/friend_glyph_desaturated.png",
            },
            {
                name: "List allowed Players",
                securityClearance: 3,
                command: ["list"],
                description: "View all players currently on the allowlist.",
                icon: "textures/ui/multiselection.png",
            },
            {
                name: "Disable the allowlist",
                securityClearance: 4,
                command: ["disable"],
                description: "Disables the allow list and clears all configured players.",
                icon: "textures/blocks/barrier.png",
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

    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const action = args.shift()?.toLowerCase();
        if (!["add", "remove", "list", "disable"].includes(action as string)) {
            message.sender.sendMessage("§o§c[Paradox] Invalid action. Use `add`, `remove`, `list`, or `disable`.");
            return;
        }

        const current = (await allowlistDB.get("players")) ?? {};

        if (action === "disable") {
            await allowlistDB.set("players", {});
            message.sender.sendMessage("§2[§7Paradox§2]§o§7 The allowlist has been disabled and cleared.");
            return;
        }

        if (action === "list") {
            const keys = Object.keys(current);
            if (keys.length === 0) {
                message.sender.sendMessage("§2[§7Paradox§2]§o§7 No players are currently allowlisted.");
            } else {
                message.sender.sendMessage("\n§2[§7Paradox§2]§o§7 Allowlisted Players:");
                keys.forEach((name) => {
                    const player = current[name];
                    if (player) {
                        message.sender.sendMessage(` §o§7| [§f${name}§7] (ID: ${player.id})`);
                    }
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
            if (current[playerName]) {
                message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" is already in the allowlist.`);
                return;
            }

            // Find target player entity in online players to capture ID
            const targetPlayer = world.getPlayers({ name: playerName })[0];

            if (!targetPlayer) {
                message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" must be online to capture their ID.`);
                return;
            }

            current[playerName] = { id: targetPlayer.id };
            await allowlistDB.set("players", current);
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}§7" has been added to the allowlist.`);
        }

        if (action === "remove") {
            if (!current[playerName]) {
                message.sender.sendMessage(`§o§c[Paradox] Player "${playerName}§c" is not in the allowlist.`);
                return;
            }

            delete current[playerName];
            await allowlistDB.set("players", current);
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Player "${playerName}§7" has been removed from the allowlist.`);
        }
    },
};
