import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startKillAuraCheck, stopKillAuraCheck } from "../../modules/killaura";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the killaura detection command.
 */
export const killauraCommand: Command = {
    name: "killaura",
    description: "Toggles the killaura detection module.",
    usage: "{prefix}killaura [ help ]",
    examples: [`{prefix}killaura`, `{prefix}killaura help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/fire_resistance_effect.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Killaura Detection Settings",
        description: "Enable or disable the Killaura detection module to prevent players from using a form of aimbots or other combat-related cheats.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/resistance_effect.png",
            },
        ],
    },

    /**
     * Executes the killaura detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent, _: string[]): Promise<void> => {
        const player = message.sender;

        // Retrieve the current state of the module from paradoxModulesDB
        const moduleData = paradoxModulesDB.get("killAuraCheck_b") ?? {
            enabled: false,
        };
        const killauraEnabled = moduleData?.enabled ?? false;

        if (!killauraEnabled) {
            // Enable the module
            moduleData.enabled = true;
            await paradoxModulesDB.set("killAuraCheck_b", moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Killaura detection has been §aenabled§7.`);
            startKillAuraCheck();
        } else {
            // Disable the module
            moduleData.enabled = false;
            await paradoxModulesDB.set("killAuraCheck_b", moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Killaura detection has been §4disabled§7.`);
            stopKillAuraCheck();
        }
    },
};
