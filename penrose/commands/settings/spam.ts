import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { paradoxModulesDB } from "../../paradox";

/**
 * Represents the antispam command.
 */
export const antispamCommand: Command = {
    name: "antispam",
    description: "Toggles chat spam checks [ Default: 2 Minutes ].",
    usage: "{prefix}antispam [ help ]",
    examples: [`{prefix}antispam`, `{prefix}antispam help`],
    category: "Modules",
    securityClearance: 4,
    guiInstructions: {
        formType: "ActionFormData",
        title: "AntiSpam Command",
        description: "Toggle the AntiSpam feature on or off.",
        actions: [
            {
                name: "Enable/Disable AntiSpam",
                command: undefined,
                description: "Enables or disables AntiSpam to prevent chat spam.",
                requiredFields: [],
                crypto: false,
            },
        ],
    },

    /**
     * Executes the antispam command.
     * @param {ChatSendBeforeEvent} message - The message object.
     */
    execute: (message: ChatSendBeforeEvent) => {
        const player = message.sender;

        const spamCheckKey = "spamCheck_b";

        // Retrieve the current state from paradoxModulesDB
        const antispamEnabled = paradoxModulesDB.get(spamCheckKey) ?? false;

        if (!antispamEnabled) {
            // Enable anti-spam
            paradoxModulesDB.set(spamCheckKey, true);
            player.sendMessage(`§2[§7Paradox§2]§o§7 AntiSpam has been §aenabled§7.`);
        } else {
            // Disable anti-spam
            paradoxModulesDB.set(spamCheckKey, false);
            player.sendMessage(`§2[§7Paradox§2]§o§7 AntiSpam has been §4disabled§7.`);
        }
    },
};
