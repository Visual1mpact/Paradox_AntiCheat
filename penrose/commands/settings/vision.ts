import { ChatSendBeforeEvent, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startVisionCheck, stopVisionCheck } from "../../modules/vision";
import { paradoxModulesDB } from "../../paradox";

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
                command: undefined,
                icon: "textures/items/spyglass.png",
            },
        ],
    },

    /**
     * Executes the vision check command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent, _: string[]) => {
        const player = message.sender;

        // Key for vision check status
        const visionCheckKey = "visionCheck_b";

        // Retrieve the current state of the module
        const visionCheckEnabled = paradoxModulesDB.get(visionCheckKey) ?? false;

        if (!visionCheckEnabled) {
            // Enable the module
            paradoxModulesDB.set(visionCheckKey, true);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Vision check has been §aenabled§7.`);
            system.run(() => {
                startVisionCheck();
            });
        } else {
            // Disable the module
            paradoxModulesDB.set(visionCheckKey, false);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Vision check has been §4disabled§7.`);
            system.run(() => {
                stopVisionCheck();
            });
        }
    },
};
