import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";
import { setInvalidMovementVectorState } from "../../modules/invalid-movement-vector";

/**
 * Represents the invalid movement vector toggle command.
 */
export const invalidMovementVectorCommand: Command = {
    name: "invalidvector",
    description: "Toggles out-of-bounds movement vector detection.",
    usage: "{prefix}invalidvector",
    examples: ["{prefix}invalidvector"],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/items/compass_item.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Invalid Vector Settings",
        description:
            "Detect and prevent players from sending out-of-bounds movement input vectors.\n\n" +
            "§7• Flags client movement inputs that exceed normal limits (-1.0 to 1.0).\n" +
            "§7• Blocks movement manipulation hacks and modified client packets.\n" +
            "§7• Instantly resets velocity when out-of-bounds input is detected.\n\n",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/Feedback.png",
                description: "Toggle the Invalid Vector detection feature on or off.",
            },
        ],
    },

    execute: async (message?: ChatSendBeforeEvent): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const checkKey = "invalidMovementVectorCheck_b";

        const moduleData = (await paradoxModulesDB.get(checkKey)) ?? {
            enabled: false,
        };
        const isEnabled = moduleData?.enabled ?? false;

        if (!isEnabled) {
            moduleData.enabled = true;
            setInvalidMovementVectorState(true);
            await paradoxModulesDB.set(checkKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Invalid Vector detection has been §aenabled§7.`);
        } else {
            moduleData.enabled = false;
            setInvalidMovementVectorState(false);
            await paradoxModulesDB.set(checkKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Invalid Vector detection has been §4disabled§7.`);
        }
    },
};
