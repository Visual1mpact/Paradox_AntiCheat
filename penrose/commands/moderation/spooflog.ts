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
    usage: "{prefix}spooflog <playerName> [--clear] | {prefix}spooflog --clearall",
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

    /**
     * Executes the spooflog command.
     *
     * @param {ChatSendBeforeEvent} message - The chat message event that triggered this command.
     * @param {string[]} args - The arguments provided with the command (e.g., player name, flags).
     */
    execute: (message: ChatSendBeforeEvent, args: string[]): void => {
        const sender = message.sender;
        const nameQuery = args
            .filter((arg) => !arg.startsWith("--"))
            .join(" ")
            .trim()
            .replace(/[@"]/g, "");

        /** @type {Record<string, TrustedPlayerData>} */
        const allRecords = spoofDB.get<Record<string, TrustedPlayerData>>("players") ?? {};

        if (args.includes("--clearall")) {
            spoofDB.set("players", {});
            sender.sendMessage("§cAll spoof logs have been cleared.");
            return;
        }

        if (!nameQuery) {
            sender.sendMessage("§cPlease provide a valid player name to search for.");
            return;
        }

        const clearLogs = args.includes("--clear");

        /**
         * Searches for a matching record where the queried name is listed in knownNames.
         * @type {[string, TrustedPlayerData] | undefined}
         */
        const matchedEntry = Object.entries(allRecords).find(([_, record]) => record.knownNames.includes(nameQuery));

        if (clearLogs) {
            if (matchedEntry) {
                const [id] = matchedEntry;
                delete allRecords[id];
                spoofDB.set("players", allRecords);
                sender.sendMessage(`§cSpoof logs for "${nameQuery}" have been cleared.`);
            } else {
                sender.sendMessage(`§cNo records found for player name "${nameQuery}".`);
            }
            return;
        }

        if (matchedEntry) {
            const [, record] = matchedEntry;

            /**
             * Formats a timestamp (ms) into a readable ISO date string.
             * @param {number} ms - Timestamp in milliseconds.
             * @returns {string} Formatted ISO date string.
             */
            const formatTimestamp = (ms: number): string => new Date(ms).toISOString();

            const output: string[] = [
                `§2[§7Paradox§2] §fSpoof Info for: §6${nameQuery}`,
                `§7Known Aliases: §f${record.knownNames.join(", ")}`,
                `§7First Seen: §f${formatTimestamp(record.firstSeen)}`,
                `§7Last Seen: §f${formatTimestamp(record.lastSeen)}`,
                `§7Stored ID: §f${record.id}`,
            ];

            if (record.spoofAttempts?.length) {
                output.push("§cSpoof Attempts:");
                record.spoofAttempts.forEach((attempt, index) => {
                    output.push(` §c${index + 1}. Name: ${attempt.name}, Time: ${formatTimestamp(attempt.timestamp)}`);
                });
            } else {
                output.push("§aNo spoof attempts detected.");
            }

            sender.sendMessage(output.join("\n"));
        } else {
            sender.sendMessage(`§cNo records found for player name "${nameQuery}".`);
        }
    },
};
