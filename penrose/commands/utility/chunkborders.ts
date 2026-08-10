import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { toggleChunks } from "../../modules/chunk-borders";

/**
 * Represents the chunk borders command.
 */
export const chunkBordersCommand: Command = {
    name: "chunkborders",
    description: "Allows you to open the chunk borders GUI.",
    usage: "{prefix}chunkborders",
    examples: [`{prefix}chunkborders`],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/ui/mashup_world.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Chunk Borders",
        description: "Toggles chunk border visibility.",
        commandOrder: "command-arg",
        actions: [{ name: "Toggle Chunk Borders", icon: "textures/ui/color_plus.png", command: ["open"], description: "Toggle chunk border visibility", requiredFields: [], crypto: false, generateModalForm: false }],
        dynamicFields: [],
    },

    /**
     * Executes the chunkborders command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent | undefined) => {
        if (!message) {
            console.error("Message is undefined. Cannot execute command.");
            return;
        }
        toggleChunks(message.sender);
    },
};
