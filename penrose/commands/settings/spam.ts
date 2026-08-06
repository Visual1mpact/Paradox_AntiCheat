import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

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
    icon: "textures/ui/message.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "AntiSpam Settings",
        description:
            "Regulate chat frequency to prevent automated spam and maintain clear communication channels.\n\n" +
            "§7• Automatically restricts users who send messages too rapidly.\n" +
            "§7• Enforcement window is active for 2 minutes after a violation is detected.\n" +
            "§7• Helps mitigate chat-based lag and promotional bot interference.\n\n",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/Feedback.png",
                description: "Toggle the AntiSpam feature on or off.",
            },
        ],
    },

    /**
     * Executes the antispam command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const spamCheckKey = "spamCheck_b";

        // Retrieve the current state from paradoxModulesDB
        const moduleData = (await paradoxModulesDB.get(spamCheckKey)) ?? {
            enabled: false,
        };
        const antispamEnabled = moduleData?.enabled ?? false;

        if (!antispamEnabled) {
            // Enable anti-spam
            moduleData.enabled = true;
            await paradoxModulesDB.set(spamCheckKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 AntiSpam has been §aenabled§7.`);
        } else {
            // Disable anti-spam
            moduleData.enabled = false;
            await paradoxModulesDB.set(spamCheckKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 AntiSpam has been §4disabled§7.`);
        }
    },
};
