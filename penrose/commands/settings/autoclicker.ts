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
        description: "Enable or disable the auto-clicker detection module to prevent players from using automated clicking tools.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                command: undefined,
                icon: "textures/ui/keyboard_and_mouse_glyph_color.png",
            },
        ],
    },

    /**
     * Executes the auto-clicker detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent, _: string[]) => {
        const player = message.sender;

        // Get auto-clicker detection status from the database
        const autoClickerEnabled = (paradoxModulesDB.get("autoClickerCheck_b") as boolean) ?? false;

        if (!autoClickerEnabled) {
            // Enable the module
            paradoxModulesDB.set("autoClickerCheck_b", true);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Auto-clicker detection has been §aenabled§7.`);

            // Start auto-clicker detection
            startAutoClicker();
        } else {
            // Disable the module
            paradoxModulesDB.set("autoClickerCheck_b", false);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Auto-clicker detection has been §4disabled§7.`);

            // Stop auto-clicker detection
            stopAutoClicker();
        }
    },
};
