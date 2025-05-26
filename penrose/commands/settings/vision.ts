import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startVisionCheck, stopVisionCheck } from "../../modules/vision";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the vision check command.
 */
export const visionCheckCommand: Command = {
    name: "visioncheck",
    description: "Toggles the vision check module.",
    usage: "{prefix}visioncheck [ help ]",
    examples: [`{prefix}visioncheck`, `{prefix}visioncheck help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/items/spyglass.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Vision Check Settings",
        description: "Enable or disable the Vision Check module to allow security personnel to inspect container contents remotely.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/items/spyglass.png",
            },
        ],
    },

    /**
     * Executes the vision check command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent, _: string[]): Promise<void> => {
        const player = message.sender;

        // Key for vision check status
        const visionCheckKey = "visionCheck_b";

        // Retrieve the current state of the module
        const moduleData = paradoxModulesDB.get(visionCheckKey) ?? {
            enabled: false,
        };
        const visionCheckEnabled = moduleData?.enabled ?? false;

        if (!visionCheckEnabled) {
            // Enable the module
            moduleData.enabled = true;
            await paradoxModulesDB.set(visionCheckKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Vision check has been §aenabled§7.`);
            startVisionCheck();
        } else {
            // Disable the module
            moduleData.enabled = false;
            await paradoxModulesDB.set(visionCheckKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Vision check has been §4disabled§7.`);
            stopVisionCheck();
        }
    },
};
