import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startScaffoldCheck, stopScaffoldCheck } from "../../modules/scaffold";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the scaffold detection command.
 */
export const scaffoldCommand: Command = {
    name: "scaffold",
    description: "Toggles the scaffold detection module.",
    usage: "{prefix}scaffold [ help ]",
    examples: [`{prefix}scaffold`, `{prefix}scaffold help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/Scaffolding.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Scaffold Detection Settings",
        description:
            "Monitor and prevent the use of automated block placement hacks, commonly known as scaffolding.\n\n" +
            "§7• Detects impossible placement angles and excessive bridging speeds.\n" +
            "§7• Analyzes player movement packets to identify non-human rhythmic placement patterns.\n" +
            "§7• Helps maintain fair gameplay during building or traversing.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/Scaffolding.png",
                description: "Toggle the scaffold detection module on or off.",
            },
        ],
    },

    /**
     * Executes the scaffold detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent | undefined, _: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const scaffoldCheckKey = "scaffoldCheck_b";

        // Retrieve the current state from paradoxModulesDB
        const moduleData = paradoxModulesDB.get(scaffoldCheckKey) ?? {
            enabled: false,
        };
        const scaffoldCheckEnabled = moduleData?.enabled ?? false;

        if (!scaffoldCheckEnabled) {
            // Enable the scaffold detection module
            moduleData.enabled = true;
            await paradoxModulesDB.set(scaffoldCheckKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Scaffold detection has been §aenabled§7.`);
            startScaffoldCheck();
        } else {
            // Disable the scaffold detection module
            moduleData.enabled = false;
            await paradoxModulesDB.set(scaffoldCheckKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Scaffold detection has been §4disabled§7.`);
            stopScaffoldCheck();
        }
    },
};
