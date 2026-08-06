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
        description:
            "Verify identity authenticity and prevent administrative impersonation.\n\n" +
            "§7• Validates usernames against character and length restrictions.\n" +
            "§7• Identifies and blocks 'Look-alike' character spoofing attempts.\n" +
            "§7• Maintains a unique identity mapping to prevent account theft.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/items/name_tag.png",
                description: "Toggle the Name-Spoof detection module on or off.",
            },
        ],
    },

    /**
     * Executes the name-spoof detection command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object; may be undefined when invoked
     *        outside of a chat event.
     * @param {string[]} _ - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent | undefined, _: string[] = []): Promise<void> => {
        if (!message) return; // nothing to do without an event
        const player = message.sender;

        // Key for name-spoof detection status
        const nameSpoofKey = "nameSpoofCheck_b";

        // Retrieve the current state of the module
        const moduleData = (await paradoxModulesDB.get(nameSpoofKey)) ?? {
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
