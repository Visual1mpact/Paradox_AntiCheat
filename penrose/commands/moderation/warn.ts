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
        description: "Manage player conduct. 3 warnings result in an automatic kick.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Add Warning",
                command: ["add"],
                requiredFields: ["playerName", "reason"],
                generateModalForm: true,
                icon: "textures/ui/warning_sad_steve.png",
            },
            {
                name: "List Warnings",
                command: ["list"],
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/icon_book_writable.png",
            },
            {
                name: "Clear Warnings",
                command: ["clear"],
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/trash_default.png",
            },
        ],
        dynamicFields: [
            { name: "Target Player:", type: "dropdown", sourceType: "players", requiredFields: ["playerName"] },
            { name: "Reason:", type: "text", placeholder: "Reason for warning", requiredFields: ["reason"] },
        ],
    },

    execute: async (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;
        const action = args.shift()?.toLowerCase();
        const playerName = args.shift()?.replace(/["@]/g, "");
        const reason = args.join(" ") || "No reason provided.";

        if (!action || !playerName) {
            message.sender.sendMessage("§o§c[Paradox] Usage: !warn <add|list|clear> <player> [reason]");
            return;
        }

        const allWarns = warnsDB.get("players") ?? {};
        const playerWarns = allWarns[playerName] ?? [];

        if (action === "add") {
            const target = PlayerCache.getPlayerByName(playerName);

            playerWarns.push({
                reason,
                staff: message.sender.name,
                timestamp: Date.now(),
            });

            allWarns[playerName] = playerWarns;
            await warnsDB.set("players", allWarns);

            message.sender.sendMessage(`§2[§7Paradox§2]§o§7 Warned §f${playerName}§7. Total: §6${playerWarns.length}§7.`);

            if (target) {
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
                message.sender.sendMessage(` §7${i + 1}. §f${w.reason} §8- By: ${w.staff}`);
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
