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
    icon: "textures/items/minecart_chest.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Inventory Editor",
        description: "Edit the items in a player's inventory.\n\n" + "§7• Select a player from the dropdown to display their items.\n",
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
