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
        description: "Enable or disable the AntiSpam feature to prevent excessive chat messages within a short period (default: 2 minutes).\n\n",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/Feedback.png",
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
        const moduleData = paradoxModulesDB.get(spamCheckKey) ?? {
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
