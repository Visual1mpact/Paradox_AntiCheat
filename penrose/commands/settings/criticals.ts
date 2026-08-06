import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the criticals toggle command.
 */
export const criticalsCommand: Command = {
    name: "criticals",
    description: "Toggles packet critical hit detection.",
    usage: "{prefix}criticals",
    examples: ["{prefix}criticals"],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/items/iron_sword.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Criticals Settings",
        description:
            "Detect and prevent players from using packet manipulation to force critical hits without jumping.\n\n" +
            "§7• Blocks 'mini-jumps' and 'packet crits' used by modules like CritBot.\n" +
            "§7• Validates vertical velocity and ground distance during attacks.\n" +
            "§7• Helps maintain fair PvP combat.\n\n",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/Feedback.png",
                description: "Toggle the Criticals detection feature on or off.",
            },
        ],
    },

    execute: async (message?: ChatSendBeforeEvent): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const checkKey = "criticalsCheck_b";

        const moduleData = (await paradoxModulesDB.get(checkKey)) ?? {
            enabled: false,
        };
        const isEnabled = moduleData?.enabled ?? false;

        if (!isEnabled) {
            moduleData.enabled = true;
            await paradoxModulesDB.set(checkKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Criticals detection has been §aenabled§7.`);
        } else {
            moduleData.enabled = false;
            await paradoxModulesDB.set(checkKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Criticals detection has been §4disabled§7.`);
        }
    },
};
