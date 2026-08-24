import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { startXrayDetection, stopXrayDetection } from "../../modules/xray";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the Xray detection command.
 */
export const xrayCommand: Command = {
    name: "xray",
    description: "Toggles the Xray detection module.",
    usage: "{prefix}xray [ help ]",
    examples: [`{prefix}xray`, `{prefix}xray help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/xyz_axis.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Xray Detection Settings",
        description:
            "Monitor and mitigate suspicious mining patterns to identify potential Xray usage.\n\n" +
            "§7• Tracks ore-to-stone ratios and identifies 'vein-jumping' behavior.\n" +
            "§7• Automatically alerts staff or applies penalties based on suspicion scores.\n" +
            "§7• Includes 'Safe Zone' mechanics to minimize false positives during legitimate mining.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/xyz_axis.png",
                description: "Toggle the Xray detection module on or off.",
            },
        ],
    },

    /**
     * Executes the Xray detection command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[] | undefined} args - The command arguments.
     * @returns {Promise<boolean | void>}
     */
    execute: async (message: ChatSendBeforeEvent | undefined): Promise<boolean | void> => {
        if (!message) return;
        const player = message.sender;

        // Get current Xray detection module state from paradoxModulesDB
        const moduleData = (await paradoxModulesDB.get("xrayDetection_b")) ?? {
            enabled: false,
        };
        const xrayEnabled = moduleData?.enabled ?? false; // Default to false if not set

        if (!xrayEnabled) {
            // Enable the Xray detection module
            moduleData.enabled = true;
            await paradoxModulesDB.set("xrayDetection_b", moduleData); // Update the state in the database
            player.sendMessage(`§2[§7Paradox§2]§o§7 Xray detection has been §aenabled§7.`);
            startXrayDetection(); // Start Xray detection
        } else {
            // Disable the Xray detection module
            moduleData.enabled = false;
            await paradoxModulesDB.set("xrayDetection_b", moduleData); // Update the state in the database
            player.sendMessage(`§2[§7Paradox§2]§o§7 Xray detection has been §4disabled§7.`);
            stopXrayDetection(); // Stop Xray detection
        }
    },
};
