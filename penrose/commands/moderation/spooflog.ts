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

// Define the spooflog command
export const spoofLogCommand: Command = {
    name: "spooflog",
    description: "View spoofing history for a player name.",
    usage: "{prefix}spooflog <playerName>",
    examples: ["{prefix}spooflog Bob", '{prefix}spooflog "Some Player"'],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/ui/icon_book_writable",
    guiInstructions: {
        formType: "ModalFormData",
        title: "Check Spoof Logs",
        description: "Enter the name of the player to view spoofing attempts.",
        dynamicFields: [
            {
                name: "Player Name",
                arg: undefined,
                type: "text",
                placeholder: "Enter player name to lookup",
                requiredFields: ["playerName"],
            },
        ],
    },

    execute: (message: ChatSendBeforeEvent, args: string[]): void => {
        const sender = message.sender;
        const nameQuery = args.join(" ").trim().replace(/[@"]/g, "");

        if (!nameQuery) {
            sender.sendMessage("§cPlease provide a valid player name to search for.");
            return;
        }

        const record = spoofDB.get<TrustedPlayerData>(nameQuery);

        if (!record) {
            sender.sendMessage(`§cNo records found for player name "${nameQuery}".`);
            return;
        }

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
    },
};
