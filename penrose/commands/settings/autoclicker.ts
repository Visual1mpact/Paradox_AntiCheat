import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startAutoClicker, stopAutoClicker } from "../../modules/autoclicker";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the auto-clicker detection command.
 */
export const autoClickerCommand: Command = {
    name: "autoclicker",
    description: "Toggles the auto-clicker detection module.",
    usage: "{prefix}autoclicker [ help ]",
    examples: [`{prefix}autoclicker`, `{prefix}autoclicker help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/keyboard_and_mouse_glyph_color.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "AutoClicker Detection Settings",
        description:
            "Monitor and mitigate unauthorized high-frequency interaction tools.\n\n" +
            "§7• Detects automated attack sequences exceeding human limits.\n" +
            "§7• Blocks unfair damage during high-CPS combat encounters.\n" +
            "§7• Alerts administrators to suspicious interaction metadata.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/keyboard_and_mouse_glyph_color.png",
                description: "Toggle the auto-clicker detection module on or off.",
            },
        ],
    },

    /**
     * Executes the auto-clicker detection command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, _: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        // Get auto-clicker detection status from the database
        const moduleData = (await paradoxModulesDB.get("autoClickerCheck_b")) ?? {
            enabled: false,
        };
        const autoClickerEnabled = moduleData?.enabled ?? false;

        if (!autoClickerEnabled) {
            // Enable the module
            moduleData.enabled = true;
            await paradoxModulesDB.set("autoClickerCheck_b", moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Auto-clicker detection has been §aenabled§7.`);

            // Start auto-clicker detection
            startAutoClicker();
        } else {
            // Disable the module
            moduleData.enabled = false;
            await paradoxModulesDB.set("autoClickerCheck_b", moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Auto-clicker detection has been §4disabled§7.`);

            // Stop auto-clicker detection
            stopAutoClicker();
        }
    },
};
