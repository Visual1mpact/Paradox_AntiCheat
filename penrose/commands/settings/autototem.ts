import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";
import { startAutoTotemCheck, stopAutoTotemCheck } from "../../modules/autototem";

/**
 * Command to toggle AutoTotem detection.
 */
export const autoTotemCommand: Command = {
    name: "autototem",
    description: "Toggles detection for automated totem replenishment.",
    usage: "{prefix}autototem",
    examples: ["{prefix}autototem"],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/items/totem.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "AutoTotem Settings",
        description:
            "Detect and prevent players from using scripts to automatically put totems in their offhand.\n\n" +
            "§7• Flags replenishment speeds faster than humanly possible.\n" +
            "§7• Automatically removes totems replenished by cheats.\n" +
            "§7• Ensures fair high-stakes PvP combat.\n\n",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/Feedback.png",
                description: "Toggle AutoTotem detection on or off.",
            },
        ],
    },

    execute: async (message?: ChatSendBeforeEvent): Promise<void> => {
        if (!message) return;
        const player = message.sender;
        const checkKey = "autoTotemCheck_b";

        const moduleData = paradoxModulesDB.get(checkKey) ?? { enabled: false };
        const isEnabled = moduleData.enabled;

        if (!isEnabled) {
            moduleData.enabled = true;
            await paradoxModulesDB.set(checkKey, moduleData);
            startAutoTotemCheck();
            player.sendMessage(`§2[§7Paradox§2]§o§7 AutoTotem detection has been §aenabled§7.`);
        } else {
            moduleData.enabled = false;
            await paradoxModulesDB.set(checkKey, moduleData);
            stopAutoTotemCheck();
            player.sendMessage(`§2[§7Paradox§2]§o§7 AutoTotem detection has been §4disabled§7.`);
        }
    },
};
