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
    icon: "textures/ui/message.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "AntiSpam Settings",
        description: "Enable or disable the AntiSpam feature to prevent excessive chat messages within a short period (default: 2 minutes).\n\n",
        actions: [
            {
                name: "Enable / Disable",
                command: undefined,
                icon: "textures/ui/message.png",
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
