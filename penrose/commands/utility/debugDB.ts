import { ChatSendBeforeEvent, Player, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { OptimizedDatabase } from "../../classes/database/data-hive";
import { MessageFormData } from "@minecraft/server-ui";

/**
 * Displays debug information about the database entries.
 * This command provides a breakdown of stored database entries, their sizes,
 * chunk counts, and overall size for debugging purposes.
 *
 * @remarks
 * Requires security clearance level 4 or higher to execute.
 * If no databases are initialized, a message will inform the user.
 */
export const debugDBCommand: Command = {
    name: "debugdb",
    description: "Displays detailed debug information about the database entries.",
    usage: "{prefix}debugdb",
    examples: ["{prefix}debugdb"],
    icon: "textures/items/compass_item.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Database Debug Info",
        description: "View a breakdown of stored database entries, their sizes, chunk counts, and overall size.",
        commandOrder: "command-arg",
        actions: [
            {
                name: "View Debug Info",
                command: [],
                requiredFields: [],
                crypto: false,
                generateModalForm: false,
            },
        ],
        dynamicFields: [],
    },
    category: "Utility",
    securityClearance: 4,

    /**
     * Executes the debugDB command.
     * Checks if the sender has sufficient security clearance and displays
     * debug information on all initialized databases.
     *
     * @param message - The event triggered when a player sends a chat message.
     */
    execute: (message: ChatSendBeforeEvent) => {
        const sender = message.sender as Player;
        const senderClearance = (sender.getDynamicProperty("securityClearance") as number) ?? 0;

        // Check security clearance
        if (senderClearance < 4) {
            sender.sendMessage("§cYou do not have permission to use this command.");
            return;
        }

        // Retrieve all database instances
        const allDatabases = OptimizedDatabase.getAllInstances();

        // Inform the user if no databases are initialized
        if (allDatabases.length === 0) {
            sender.sendMessage("§7No databases have been initialized.");
            return;
        }

        /**
         * Displays the debug form with the information about the databases.
         * This includes the pointers, chunk sizes, and total sizes of the entries.
         *
         * @param sender - The player who invoked the command.
         */
        const showDebugForm = (sender: Player) => {
            let debugInfoText = "§l§eDatabase Debug Information§r\n";

            // Iterate over all databases and display their information
            allDatabases.forEach((db) => {
                debugInfoText += `\n§b• Database: §r${db.name}\n`;

                const pointers = db.listPointers().sort();
                const totalSize = db.getTotalSizeFormatted();

                // Handle case when no pointers are found
                if (pointers.length === 0) {
                    debugInfoText += "  - No pointers available.\n";
                } else {
                    debugInfoText += "  - Pointers:\n";
                    pointers.forEach((pointer) => {
                        const entrySize = db.getEntrySizeBytes(pointer.split("/").pop()!);
                        debugInfoText += `    - ${pointer}: ${db._formatBytes(entrySize)}\n`;

                        // Check if the entry is chunked and count the number of chunks
                        const chunkCount = db.getChunkCount(pointer.split("/").pop()!);
                        if (chunkCount > 1) {
                            debugInfoText += `      - This entry has ${chunkCount} chunks.\n`;
                        }
                    });
                }

                // Add total size info for the database
                debugInfoText += `\n  - Total Size: ${totalSize}\n`;
                debugInfoText += "§8-----------------------------§r\n";
            });

            // Truncate if too long for Minecraft UI (~32k char limit; we use ~30k buffer)
            if (debugInfoText.length > 30000) {
                debugInfoText = debugInfoText.slice(0, 29900) + "\n\n§c[Output truncated due to size limit]";
            }

            // Create and show the form to the player
            const form = new MessageFormData().title("           Database Debug Info").body(debugInfoText).button1("Close With This").button2("Close With That");

            form.show(sender).then((response) => {
                if (response.cancelationReason === "UserBusy") {
                    showDebugForm(sender);
                }
            });
        };

        // Inform the user to close chat for GUI display
        sender.sendMessage("§2[§7Paradox§2]§o§7 Please close your chat window to view the GUI for DB Debugging Info.");

        // Show the debug form to the sender
        system.run(() => {
            showDebugForm(sender);
        });
    },
};
