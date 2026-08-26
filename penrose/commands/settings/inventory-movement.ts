import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";
import { setInventoryMovementState } from "../../modules/inventory-movement-module";

/**
 * Represents the inventory movement toggle command.
 */
export const inventoryMovementCommand: Command = {
    name: "invmove",
    description: "Toggles inventory movement detection.",
    usage: "{prefix}invmove",
    examples: ["{prefix}invmove"],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/icon_blackfriday.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Inventory Movement Settings",
        description:
            "Detect and prevent players from moving while interacting with or organizing items in their inventory.\n\n" +
            "§7• Flags players who move items while maintaining player velocity.\n" +
            "§7• Blocks inventory movement hacks (InvMove / ChestWalk).\n" +
            "§7• Instantly resets player velocity upon detection.\n\n",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/recipe_book_icon.png",
                description: "Toggle the Inventory Movement detection feature on or off.",
            },
        ],
    },

    execute: async (message?: ChatSendBeforeEvent): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const checkKey = "inventoryMovementCheck_b";

        const moduleData = (await paradoxModulesDB.get(checkKey)) ?? {
            enabled: false,
        };
        const isEnabled = moduleData?.enabled ?? false;

        if (!isEnabled) {
            moduleData.enabled = true;
            setInventoryMovementState(true);
            await paradoxModulesDB.set(checkKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Inventory Movement detection has been §aenabled§7.`);
        } else {
            moduleData.enabled = false;
            setInventoryMovementState(false);
            await paradoxModulesDB.set(checkKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Inventory Movement detection has been §4disabled§7.`);
        }
    },
};
