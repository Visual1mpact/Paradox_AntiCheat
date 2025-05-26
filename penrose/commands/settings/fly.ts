import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startFlyCheck, stopFlyCheck } from "../../modules/fly";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the antifly command.
 */
export const flyCheckCommand: Command = {
    name: "antifly",
    description: "Toggles checks for illegal flying.",
    usage: "{prefix}antifly [ help ]",
    examples: [`{prefix}antifly`, `{prefix}antifly help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/items/elytra.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Anti-Fly Detection Settings",
        description: "Enable or disable checks for illegal flying to prevent players from exploiting flight mechanics.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/items/elytra.png",
            },
        ],
    },

    /**
     * Executes the antifly command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent, _: string[]): Promise<void> => {
        const player = message.sender;

        // Get fly detection status from the database
        const moduleData = paradoxModulesDB.get("flyCheck_b") ?? {
            enabled: false,
        };
        const antiflyEnabled = moduleData?.enabled ?? false;

        if (!antiflyEnabled) {
            // Enable the module
            moduleData.enabled = true;
            await paradoxModulesDB.set("flyCheck_b", moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Fly detection has been §aenabled§7.`);

            // Start fly detection
            startFlyCheck();
        } else {
            // Disable the module
            moduleData.enabled = false;
            await paradoxModulesDB.set("flyCheck_b", moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Fly detection has been §4disabled§7.`);

            // Stop fly detection
            stopFlyCheck();
        }
    },
};
