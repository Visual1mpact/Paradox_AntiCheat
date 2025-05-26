import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startNamespoofDetection, stopNamespoofDetection } from "../../modules/namespoof";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the name-spoof detection command.
 */
export const nameSpoofCommand: Command = {
    name: "namespoof",
    description: "Toggles the name-spoof detection module.",
    usage: "{prefix}namespoof [ help ]",
    examples: [`{prefix}namespoof`, `{prefix}namespoof help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/items/name_tag.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Name-Spoof Detection Settings",
        description: "Enable or disable the Name-Spoof detection module to prevent players from using fake usernames to impersonate others.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/items/name_tag.png",
            },
        ],
    },

    /**
     * Executes the name-spoof detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent, _: string[]): Promise<void> => {
        const player = message.sender;

        // Key for name-spoof detection status
        const nameSpoofKey = "nameSpoofCheck_b";

        // Retrieve the current state of the module
        const moduleData = paradoxModulesDB.get(nameSpoofKey) ?? {
            enabled: false,
        };
        const nameSpoofEnabled = moduleData?.enabled ?? false;

        if (!nameSpoofEnabled) {
            // Enable the module
            moduleData.enabled = true;
            await paradoxModulesDB.set(nameSpoofKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Name-spoof detection has been §aenabled§7.`);
            startNamespoofDetection();
        } else {
            // Disable the module
            moduleData.enabled = false;
            await paradoxModulesDB.set(nameSpoofKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Name-spoof detection has been §4disabled§7.`);
            stopNamespoofDetection();
        }
    },
};
