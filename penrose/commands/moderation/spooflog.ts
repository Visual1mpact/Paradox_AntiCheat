import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent } from "@minecraft/server";
import { spoofDB } from "../../event-listeners/world-initialize";

/**
 * Represents the spooflog command for inspecting or clearing spoofing attempts on players.
 */
export const spoofLogCommand: Command = {
    name: "spooflog",
    description: "View or clear spoofing history for a player name or clear all logs.",
    usage: "{prefix}spooflog <playerName|id> [--clear] | {prefix}spooflog --clearall",
    examples: ["{prefix}spooflog Bob", '{prefix}spooflog "Some Player"', "{prefix}spooflog Bob --clear", "{prefix}spooflog --clearall"],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/ui/icon_book_writable",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Check or Clear Spoof Logs",
        description: "Enter the name of the player to view or clear spoofing attempts, or clear all logs.",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Select Player",
                description: "Choose a player to view or clear spoof attempts by other imposters.",
                requiredFields: ["playerName"],
                generateModalForm: true,
                icon: "textures/ui/icon_multiplayer.png",
            },
            {
                name: "Clear All Spoof Logs",
                command: ["--clearall"],
                description: "Click this to clear all logs in the database",
                generateModalForm: false,
                icon: "textures/ui/trash_default.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nPlayer Name",
                type: "text",
                placeholder: "Enter player name to lookup",
                requiredFields: ["playerName"],
            },
            {
                name: "\nClear Spoof Logs",
                arg: "--clear",
                type: "toggle",
                placeholder: "Check this to clear logs",
                requiredFields: ["playerName"],
            },
        ],
    },

    /**
     * Executes the spooflog command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const sender = message.sender;
        const nameQuery = args
            .filter((arg) => !arg.startsWith("--"))
            .join(" ")
            .trim()
            .replace(/["@]/g, "")
            .toLowerCase();

        const spoofData = spoofDB.get("players") ?? {};

        // Clear all logs
        if (args.includes("--clearall")) {
            await spoofDB.set("players", {});
            sender.sendMessage("§o§c[Paradox] All spoof logs have been cleared.");
            return;
        }

        if (!nameQuery) {
            sender.sendMessage("§o§c[Paradox] Please enter a name or ID to search for.");
            return;
        }

        const clearRecord = args.includes("--clear");

        // Find matching entry
        const matched = Object.entries(spoofData).find(([id, record]) => {
            const nameMatch = record.name.toLowerCase().includes(nameQuery);
            const knownMatch = record.knownNames.some((n) => n.toLowerCase().includes(nameQuery));
            const idMatch = id.toLowerCase().includes(nameQuery);
            return idMatch || nameMatch || knownMatch;
        });

        if (!matched) {
            sender.sendMessage(`§o§c[Paradox] No spoof record found matching "${nameQuery}§c".`);
            return;
        }

        const [matchedId, matchedRecord] = matched;

        if (clearRecord) {
            delete spoofData[matchedId];
            await spoofDB.set("players", spoofData);
            sender.sendMessage(`§o§c[Paradox] Record for "${matchedRecord.name}" (ID: ${matchedId}) has been cleared.`);
            return;
        }

        const formatTimestamp = (ms: number): string => new Date(ms).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

        const lines: string[] = [
            `§2[§7Paradox§2] §fSpoof Info for: §6${matchedRecord.name}`,
            `§7Known Aliases: §f${matchedRecord.knownNames.join(", ")}`,
            `§7First Seen: §f${formatTimestamp(matchedRecord.firstSeen)}`,
            `§7Last Seen: §f${formatTimestamp(matchedRecord.lastSeen)}`,
            `§7Stored ID: §f${matchedId}`,
        ];

        sender.sendMessage(lines.join("\n"));
    },
};
