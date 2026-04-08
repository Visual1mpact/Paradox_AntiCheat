import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/player-cache";
import { warnsDB } from "../../event-listeners/world-initialize";

export const warnCommand: Command = {
    name: "warn",
    description: "Manage player warnings and automated escalations.",
    usage: "{prefix}warn <add|list|clear> <player> [reason]",
    examples: [`{prefix}warn add Steve Spamming`, `{prefix}warn list Steve`, `{prefix}warn clear Steve`],
    category: "Moderation",
    securityClearance: 3,
    icon: "textures/ui/warning_alex.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Warning System",
        description:
            "Manage player conduct and infractions. 3 warnings result in an automatic kick and suspension.\n\n" +
            "§7• §fOnline Selection§7: Quickly warn players currently in the world.\n" +
            "§7• §fOffline/Manual§7: Warn players by name (even if offline).\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Add Warning",
                icon: "textures/ui/warning_sad_steve.png",
                generateSubActions: true,
                subActions: [
                    {
                        name: "Online Player",
                        command: ["add"],
                        requiredFields: ["onlinePlayerName", "reason"],
                        generateModalForm: true,
                        icon: "textures/ui/player_online_icon.png",
                    },
                    {
                        name: "Offline Player",
                        command: ["add"],
                        requiredFields: ["offlinePlayerName", "reason"],
                        generateModalForm: true,
                        icon: "textures/ui/player_offline_icon.png",
                    },
                ],
            },
            {
                name: "List Warnings",
                icon: "textures/ui/icon_book_writable.png",
                generateSubActions: true,
                subActions: [
                    {
                        name: "Online Player",
                        command: ["list"],
                        requiredFields: ["onlinePlayerName"],
                        generateModalForm: true,
                        icon: "textures/ui/player_online_icon.png",
                    },
                    {
                        name: "Offline Player",
                        command: ["list"],
                        requiredFields: ["offlinePlayerName"],
                        generateModalForm: true,
                        icon: "textures/ui/player_offline_icon.png",
                    },
                ],
            },
            {
                name: "Clear Warnings",
                icon: "textures/ui/trash_default.png",
                securityClearance: 4,
                generateSubActions: true,
                subActions: [
                    {
                        name: "Online Player",
                        command: ["clear"],
                        requiredFields: ["onlinePlayerName"],
                        generateModalForm: true,
                        icon: "textures/ui/player_online_icon.png",
                    },
                    {
                        name: "Offline Player",
                        command: ["clear"],
                        requiredFields: ["offlinePlayerName"],
                        generateModalForm: true,
                        icon: "textures/ui/player_offline_icon.png",
                    },
                ],
            },
        ],
        dynamicFields: [
            { name: "\nSelect Online Player:", type: "dropdown", sourceType: "players", requiredFields: ["onlinePlayerName"] },
            { name: "\nEnter Player Name:", type: "text", placeholder: "Case-sensitive name", requiredFields: ["offlinePlayerName"] },
            { name: "Reason:", type: "text", placeholder: "Reason for warning", requiredFields: ["reason"] },
        ],
    },

    execute: async (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;

        if (args.length < 2) {
            message.sender.sendMessage("§o§c[Paradox] Usage: !warn <add|list|clear> <player> [reason]");
            return;
        }

        const action = args.shift()?.toLowerCase();

        // If the action is list/clear and we have exactly one arg left, it's the name.
        // If it's 'add', we take the next arg as the name and the rest as reason.
        const playerName = args.shift()?.replace(/["@]/g, "");
        const reason = args.join(" ").trim() || "No reason provided.";

        if (!action || !playerName) {
            message.sender.sendMessage("§o§c[Paradox] Usage: !warn <add|list|clear> <player> [reason]");
            return;
        }

        const allWarns = warnsDB.get("players") ?? {};
        const playerWarns = allWarns[playerName] ?? [];

        if (action === "add") {
            const target = PlayerCache.getPlayerByName(playerName); // Try to get online player for immediate feedback
            playerWarns.push({
                reason,
                staff: message.sender.name,
                timestamp: Date.now(),
            });

            allWarns[playerName] = playerWarns;
            await warnsDB.set("players", allWarns);

            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Warned §f${playerName}§7. Total: §6${playerWarns.length}§7.`);

            if (target) {
                // Only send message and kick if player is online
                target.sendMessage(`§o§c[Paradox] You have been warned: ${reason} (Total: ${playerWarns.length})`);

                // Automated Escalation: Kick on 3rd warning
                if (playerWarns.length >= 3) {
                    target.runCommand(`kick @s Automatic Kick: Too many warnings (${playerWarns.length}/3).`);
                }
            }
        } else if (action === "list") {
            if (playerWarns.length === 0) {
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 §f${playerName}§7 has no warnings.`);
                return;
            }

            message.sender.sendMessage(`\n§2[§7Paradox§2]§o§7 Warnings for §f${playerName}§7:`);
            playerWarns.forEach((w: { reason: string; staff: string; timestamp: number }, i: number) => {
                const date = new Date(w.timestamp).toLocaleDateString();
                message.sender.sendMessage(` §7${i + 1}. §f${w.reason} §8- By: ${w.staff} (${date})`);
            });
        } else if (action === "clear") {
            if ((message.sender.getDynamicProperty("securityClearance") as number) < 4) {
                message.sender.sendMessage("§o§c[Paradox] Only Level 4 admins can clear warnings.");
                return;
            }

            delete allWarns[playerName];
            await warnsDB.set("players", allWarns);
            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Cleared all warnings for §f${playerName}§7.`);
        }
    },
};
