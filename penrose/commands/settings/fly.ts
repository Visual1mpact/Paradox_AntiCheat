import { ChatSendBeforeEvent, system } from "@minecraft/server";
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
                command: undefined,
                icon: "textures/items/elytra.png",
            },
        ],
    },

    /**
     * Executes the antifly command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent, _: string[]) => {
        const player = message.sender;

        // Get fly detection status from the database
        const antiflyEnabled = (paradoxModulesDB.get("flyCheck_b") as boolean) ?? false;

        if (!antiflyEnabled) {
            // Enable the module
            paradoxModulesDB.set("flyCheck_b", true);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Fly detection has been §aenabled§7.`);

            // Start fly detection
            system.run(() => {
                startFlyCheck();
            });
        } else {
            // Disable the module
            paradoxModulesDB.set("flyCheck_b", false);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Fly detection has been §4disabled§7.`);

            // Stop fly detection
            system.run(() => {
                stopFlyCheck();
            });
        }
    },
};
