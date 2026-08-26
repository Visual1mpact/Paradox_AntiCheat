import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { toggleChunks } from "../../modules/chunk-borders-module";

export const chunkBordersCommand: Command = {
    name: "chunkborders",
    description: "Allows you to open the chunk borders GUI to toggle chunk border overlays.",
    usage: "{prefix}chunkborders",
    examples: [`{prefix}chunkborders`],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/ui/mashup_world.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Chunk Borders",
        description:
            "Visualize active 16x16 world chunk boundaries in real-time using debug rendering.\n\n" +
            "§7• Toggle chunk border rendering directly for your active session.\n\n" +
            "§7• Highlights vertical chunk grids, sub-chunk section rings (every 16 blocks), and corner pillars.\n\n" +
            "§7• Automatically updates and redraws overlay lines as you travel between chunks.\n\n" +
            "§7• Note: Uses low-overhead generator threading to prevent performance drops during rendering.\n\n",
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
