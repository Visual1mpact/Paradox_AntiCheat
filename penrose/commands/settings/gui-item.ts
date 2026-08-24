import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { commandHandler } from "../../event-listeners/world-initialize";
import { itemUseSubscription } from "../../classes/subscriptions/item-use-subscriptions";

/**
 * Command to set the item ID that triggers the Paradox GUI.
 */
export const guiItemCommand: Command = {
    name: "guiitem",
    description: "Sets or clears the item used to open the Paradox GUI when used.",
    usage: "{prefix}guiitem [itemId | clear]",
    examples: ["{prefix}guiitem minecraft:compass", "{prefix}guiitem clear"],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/ui/inventory_icon.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "GUI Trigger Item",
        description:
            "Configure a specific item that opens the Paradox GUI upon use (right-click or long-press).\n\n" +
            "§7• §fSet Item ID§7: Define the item (e.g., minecraft:compass).\n" +
            "§7• §fClear Item§7: Disable item-based GUI access.\n\n" +
            "§7Warning: This trigger will be active for any player using the item.\n\n",
        actions: [
            {
                name: "Set Trigger Item",
                icon: "textures/ui/color_picker.png",
                generateModalForm: true,
                requiredFields: ["itemId"],
            },
            {
                name: "Clear Trigger Item",
                icon: "textures/ui/trash.png",
                command: ["clear"],
            },
        ],
        dynamicFields: [
            {
                name: "\nEnter Minecraft Item ID:",
                type: "text",
                placeholder: "minecraft:compass",
                requiredFields: ["itemId"],
            },
        ],
    },
    execute: (message?: ChatSendBeforeEvent, args: string[] = []) => {
        if (!message) return;
        const player = message.sender;
        const input = args[0]?.toLowerCase();

        // If no argument, show current status
        if (!input) {
            const current = commandHandler.getGuiItem();
            player.sendMessage(`§2[§7Paradox§2]§o§7 Current GUI trigger item: §f${current ?? "None"}`);
            return;
        }

        // Handle clearing the item
        if (input === "clear") {
            commandHandler.setGuiItem(undefined);
            itemUseSubscription.unsubscribe();
            player.sendMessage("§2[§7Paradox§2]§o§7 GUI trigger item has been §fcleared§7.");
            return;
        }

        // Basic validation: must be a valid item ID format (namespace:item)
        if (!input.includes(":")) {
            player.sendMessage("§o§c[Paradox] Please provide a valid item ID (e.g., minecraft:compass).");
            return;
        }

        // Standard Bedrock item IDs use lowercase
        commandHandler.setGuiItem(input);
        itemUseSubscription.subscribe();
        player.sendMessage(`§2[§7Paradox§2]§o§7 GUI trigger item set to: §f${input}`);
        player.sendMessage(`§2[§7Paradox§2]§o§7 Any player using this item will now open the Paradox GUI.`);
    },
};
