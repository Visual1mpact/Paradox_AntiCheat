import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { startKillAuraCheck, stopKillAuraCheck } from "../../modules/killaura-module";
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
        description:
            "Identify and neutralize combat-automated aimbots and illegal rotation scripts.\n\n" +
            "§7• Analyzes attack frequency and target orientation accuracy.\n" +
            "§7• Monitors suspicious 'vein-locked' combat patterns.\n" +
            "§7• Intercepts and cancels attacks originating from impossible view angles.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/resistance_effect.png",
                description: "Toggle the Killaura detection module on or off.",
            },
        ],
    },

    /**
     * Executes the killaura detection command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent | undefined, _?: string[]): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        // Retrieve the current state of the module from paradoxModulesDB
        const moduleData = (await paradoxModulesDB.get("killAuraCheck_b")) ?? {
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
