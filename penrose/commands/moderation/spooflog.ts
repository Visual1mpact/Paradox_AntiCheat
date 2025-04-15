import { Command } from "../../classes/command-handler";
import { ChatSendBeforeEvent } from "@minecraft/server";
import { spoofDB } from "../../event-listeners/world-initialize";

/**
 * Represents stored identity data for a trusted player.
 */
interface TrustedPlayerData {
    /**
     * The unique player ID originally associated with this name.
     */
    id: string;

    /**
     * The timestamp (in milliseconds) when the name was first seen with the trusted ID.
     */
    firstSeen: number;

    /**
     * The last time this name was seen, regardless of spoof or not.
     */
    lastSeen: number;

    /**
     * Optional list of spoofing attempts, if any other players have tried to use this name.
     */
    spoofAttempts?: {
        /**
         * The spoofing player's actual ID.
         */
        id: string;

        /**
         * The timestamp when the spoofing attempt occurred.
         */
        timestamp: number;
    }[];
}

/**
 * Represents the spooflog command.
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
     * @param {ChatSendBeforeEvent} message - The message object that contains details about the chat event.
     * @param {string[]} args - The arguments passed along with the command.
     */
    execute: (message: ChatSendBeforeEvent, args: string[]): void => {
        const sender = message.sender;
        const nameQuery = args
            .filter((arg) => !arg.startsWith("--"))
            .join(" ")
            .trim()
            .replace(/[@"]/g, "");

        if (args.includes("--clearall")) {
            // Clear all entries in the spoofDB
            spoofDB.clear(); // Assuming the `clear()` method is available for the DB
            sender.sendMessage("§cAll spoof logs have been cleared.");
            return;
        }

        if (!nameQuery) {
            sender.sendMessage("§cPlease provide a valid player name to search for.");
            return;
        }

        const clearLogs = args.includes("--clear");

        // If the --clear flag is present, delete the record
        if (clearLogs) {
            const record = spoofDB.get<TrustedPlayerData>(nameQuery);

            if (record) {
                // Delete the record from the database
                spoofDB.delete(nameQuery);
                sender.sendMessage(`§cSpoof logs for "${nameQuery}" have been cleared.`);
            } else {
                sender.sendMessage(`§cNo records found for player name "${nameQuery}".`);
            }
            return;
        }

        // Normal spoof log display if not clearing
        const record = spoofDB.get<TrustedPlayerData>(nameQuery);

        if (record) {
            const formatTimestamp = (ms: number) => new Date(ms).toISOString();

            const output: string[] = [`§7[§2Paradox§7] §fSpoof Info for: §6${nameQuery}`, `§7First Seen: §f${formatTimestamp(record.firstSeen)}`, `§7Last Seen: §f${formatTimestamp(record.lastSeen)}`, `§7Stored ID: §f${record.id}`];

            if (record.spoofAttempts && record.spoofAttempts.length > 0) {
                output.push("§cSpoof Attempts:");
                record.spoofAttempts.forEach((attempt, index) => {
                    output.push(` §c${index + 1}. ID: ${attempt.id}, Time: ${formatTimestamp(attempt.timestamp)}`);
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
