import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { startFlyCheck, stopFlyCheck } from "../../modules/fly-module";
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
        description:
            "Enforce legitimate movement mechanics and restrict unauthorized flight capabilities.\n\n" +
            "§7• Monitors vertical velocity and airborne duration for illegal suspension.\n" +
            "§7• Accounts for tridents, riptide, and standard vanilla knockback.\n" +
            "§7• Reverts players to safe locations upon detection of sustained flight.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/items/elytra.png",
                description: "Toggle the Anti-Fly detection module on or off.",
            },
        ],
    },

    /**
     * Executes the antifly command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, _: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        // Get fly detection status from the database
        const moduleData = (await paradoxModulesDB.get("flyCheck_b")) ?? {
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
