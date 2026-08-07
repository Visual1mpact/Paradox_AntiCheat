import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { showInventoryEditor } from "../gui/inventory-editor-ddui";

/**
 * Represents the inventory editor command.
 */
export const inventoryEditorCommand: Command = {
    name: "inventoryeditor",
    description: "Allows you to open the inventory editor GUI to edit a player's inventory.",
    usage: "{prefix}inventoryeditor",
    examples: [`{prefix}inventoryeditor`],
    category: "Utility",
    securityClearance: 3,
    icon: "textures/blocks/enchanting_table_top.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Inventory Editor",
        description:
            "Inspect and modify online player inventories via dynamic DDUI controls.\n\n" +
            "§7• Select a player from the dropdown to display their inventory layout.\n\n" +
            "§7• Choose an action mode: View, Edit Name/Lore, Edit Enchantments, Repair, Transfer, Edit Stack Amount, or Swap Slots.\n\n" +
            "§7• Enter the target slot number to examine item details or apply mutations.\n\n" +
            "§7• Transfer items directly to another online player's open inventory slots.\n\n" +
            "§7• Modify stack amounts or swap slot contents within the selected player's container.\n\n" +
            "§7• Press 'Apply Changes' to execute the selected operation and update the state.\n\n" +
            "§7• Note: Ensure appropriate permissions before altering player items and use responsibly.\n\n",
        commandOrder: "command-arg",
        actions: [{ name: "Open Inventory Editor", icon: "textures/ui/color_plus.png", command: ["open"], description: "Open the inventory editor", requiredFields: [], crypto: false, generateModalForm: false }],
        dynamicFields: [],
    },

    /**
     * Executes the inventoryeditor command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent | undefined) => {
        if (!message) {
            console.error("Message is undefined. Cannot execute command.");
            return;
        }
        message.sender.sendMessage("§2[§7Paradox§2]§o§7 Please close your chat window to open the inventory editor.");
        showInventoryEditor(message.sender);
    },
};
