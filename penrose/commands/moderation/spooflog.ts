import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent } from "@minecraft/server";
import { spoofDB } from "../../event-listeners/world-initialize";

/**
 * Data model for a trusted player stored in the spoof detection system.
 */
interface TrustedPlayerData {
    /** Unique identifier for the player */
    id: string;
    /** List of known usernames used by this player */
    knownNames: string[];
    /** Timestamp of when this player was first seen */
    firstSeen: number;
    /** Timestamp of when this player was last seen */
    lastSeen: number;
    /**
     * History of spoof attempts made using this player’s identity.
     * Each entry contains the spoofed name and the time it occurred.
     */
    spoofAttempts?: {
        /** Name used during the spoof attempt */
        name: string;
        /** Timestamp of the spoof attempt */
        timestamp: number;
    }[];
}

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
        actions: [
            {
                name: "Select Player",
                command: undefined,
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
                name: "Player Name",
                arg: undefined,
                type: "text",
                placeholder: "Enter player name to lookup",
                requiredFields: ["playerName"],
            },
            {
                name: "Clear Spoof Logs",
                arg: "--clear",
                type: "toggle",
                placeholder: "Check this to clear logs",
                requiredFields: ["playerName"],
            },
        ],
    },

    execute: (message: ChatSendBeforeEvent, args: string[]): void => {
        const sender = message.sender;
        const nameQuery = args
            .filter((arg) => !arg.startsWith("--"))
            .join(" ")
            .trim()
            .replace(/[@"]/g, "")
            .toLowerCase();

        const allRecords = spoofDB.get<Record<string, TrustedPlayerData>>("players") ?? {};

        if (args.includes("--clearall")) {
            spoofDB.set("players", {});
            sender.sendMessage("§o§c[Paradox] All spoof logs have been cleared.");
            return;
        }

        if (!nameQuery) {
            sender.sendMessage("§o§c[Paradox] Please provide a valid player name to search for.");
            return;
        }

        const clearLogs = args.includes("--clear");

        // For clearing: exact match only by ID or known name
        if (clearLogs) {
            let exactMatchEntry: [string, TrustedPlayerData] | undefined = undefined;

            if (allRecords[nameQuery]) {
                exactMatchEntry = [nameQuery, allRecords[nameQuery]];
            } else {
                exactMatchEntry = Object.entries(allRecords).find(([_, record]) => record.knownNames.includes(nameQuery));
            }

            if (!exactMatchEntry) {
                sender.sendMessage(`§o§c[Paradox] No exact match found for "${nameQuery}§c". No records were cleared.`);
                return;
            }

            const [exactId] = exactMatchEntry;
            delete allRecords[exactId];
            spoofDB.set("players", allRecords);
            sender.sendMessage(`§o§c[Paradox] Spoof logs for "${nameQuery}§c" (ID: ${exactId}) have been cleared.`);
            return;
        }

        // For viewing: allow partial match by ID or known name
        const matchingEntries = Object.entries(allRecords).filter(([id, record]) => id.toLowerCase().includes(nameQuery) || record.knownNames.some((name) => name.toLowerCase().includes(nameQuery)));

        if (matchingEntries.length === 0) {
            sender.sendMessage(`§o§c[Paradox] No records found matching "${nameQuery}§c".`);
            return;
        }

        const formatTimestamp = (ms: number): string => new Date(ms).toISOString();

        if (matchingEntries.length > 1) {
            sender.sendMessage(`§eMultiple records found matching "${nameQuery}":`);
            for (const [id, record] of matchingEntries) {
                sender.sendMessage(
                    [
                        `§7- §fStored ID: §6${id}`,
                        `  §7Aliases: §f${record.knownNames.join(", ")}`,
                        `  §7First Seen: §f${formatTimestamp(record.firstSeen)}`,
                        `  §7Last Seen: §f${formatTimestamp(record.lastSeen)}`,
                        `  §7Spoof Attempts: §f${record.spoofAttempts?.length ?? 0}`,
                    ].join("\n")
                );
            }
            sender.sendMessage(`§7Use a more specific name or ID to narrow your query if needed.`);
            return;
        }

        const [, matchedRecord] = matchingEntries[0];

        const output: string[] = [
            `§2[§7Paradox§2] §fSpoof Info for: §6${nameQuery}`,
            `§7Known Aliases: §f${matchedRecord.knownNames.join(", ")}`,
            `§7First Seen: §f${formatTimestamp(matchedRecord.firstSeen)}`,
            `§7Last Seen: §f${formatTimestamp(matchedRecord.lastSeen)}`,
            `§7Stored ID: §f${matchedRecord.id}`,
        ];

        if (matchedRecord.spoofAttempts?.length) {
            output.push("§cSpoof Attempts:");
            matchedRecord.spoofAttempts.forEach((attempt, index) => {
                output.push(` §c${index + 1}. Name: ${attempt.name}§c, Time: ${formatTimestamp(attempt.timestamp)}`);
            });
        } else {
            output.push("§aNo spoof attempts detected.");
        }

        sender.sendMessage(output.join("\n"));
    },
};
