import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";
import { startHotbarCheck, stopHotbarCheck } from "../../modules/hotbar-check-module";

/**
 * Represents the command to toggle hotbar slot validation.
 */
export const hotbarCheckCommand: Command = {
    name: "hotbarcheck",
    description: "Toggles hotbar slot selection range validation.",
    usage: "{prefix}hotbarcheck",
    examples: ["{prefix}hotbarcheck"],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/items/compass.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Hotbar Check Settings",
        description: "Detect and handle out-of-bounds hotbar slot selections.\n\n" + "§7• Validates that selected hotbar indices remain within 0-9.\n" + "§7• Logs potential packet/modded hotbar manipulation violations.\n\n",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/Feedback.png",
                description: "Toggle the Hotbar Range detection feature on or off.",
            },
        ],
    },

    /**
     * Executes the hotbar check command to toggle state.
     *
     * @param {ChatSendBeforeEvent} [message] - The chat command execution context.
     * @returns {Promise<void>} Resolves when the toggle operation completes.
     */
    execute: async (message?: ChatSendBeforeEvent): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const checkKey = "hotbarCheck_b";

        const moduleData = (await paradoxModulesDB.get(checkKey)) ?? {
            enabled: false,
        };
        const isEnabled = moduleData?.enabled ?? false;

        if (!isEnabled) {
            moduleData.enabled = true;
            await paradoxModulesDB.set(checkKey, moduleData);
            startHotbarCheck();
            player.sendMessage(`§2[§7Paradox§2]§o§7 Hotbar check detection has been §aenabled§7.`);
        } else {
            moduleData.enabled = false;
            await paradoxModulesDB.set(checkKey, moduleData);
            stopHotbarCheck();
            player.sendMessage(`§2[§7Paradox§2]§o§7 Hotbar check detection has been §4disabled§7.`);
        }
    },
};
