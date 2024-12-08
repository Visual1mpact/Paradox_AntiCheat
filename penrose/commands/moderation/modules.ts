import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { paradoxModulesDB } from "../../paradox";

/**
 * Represents the modules status command.
 */
export const modulesStatusCommand: Command = {
    name: "modules",
    description: "Shows the status of all modules.",
    usage: "{prefix}modules [ help ]",
    examples: [`{prefix}modules`, `{prefix}modules help`],
    category: "Moderation",
    securityClearance: 4,

    /**
     * Executes the modules status command.
     * @param {ChatSendBeforeEvent} message - The message object.
     */
    execute: (message: ChatSendBeforeEvent) => {
        // Helper function to get status as a string
        const status = (enabled: boolean) => (enabled ? "§aENABLED" : "§4DISABLED");

        // Helper function to convert camelCase to Title Case
        const toTitleCase = (str: string) => str.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());

        const player = message.sender;

        // Retrieve all module names and states from the database
        const allModuleKeys = paradoxModulesDB.entries(); // [key, value] pairs
        const booleanModules: [string, boolean][] = [];
        const settingsModules: { [key: string]: any } = {};

        // Categorize the modules
        allModuleKeys.forEach(([key, value]) => {
            if (key.endsWith("_b")) {
                booleanModules.push([key, value as boolean]);
            } else if (key.endsWith("_settings")) {
                settingsModules[key] = value;
            }
        });

        // Generate the status messages in a tree-like format
        const moduleStatuses = [`§2[§7Paradox§2]§o§7 List Of Modules:`, `§r§2├─§o§7 Registered Modules:`];

        // Check if there are any boolean modules
        if (booleanModules.length === 0) {
            moduleStatuses.push("§r§2│  └─§o§7 No modules are currently enabled.");
        } else {
            booleanModules.forEach(([key, value]) => {
                const moduleName = toTitleCase(key.replace(/_b$/, "").replace(/_/g, " "));
                const line = `§r§2│  └─§o§7 ${moduleName}: ${status(value)}`;
                moduleStatuses.push(line);
            });
        }

        // Check if there are any settings modules
        if (Object.keys(settingsModules).length === 0) {
            moduleStatuses.push("§r§2└─§o§7 No settings are currently set for any registered modules.");
        } else {
            moduleStatuses.push("§r§2└─§o§7 Settings Modules:");
            Object.entries(settingsModules).flatMap(([key, settings], index, array) => {
                const isLastModule = index === array.length - 1;
                const moduleTitle = `   ${isLastModule ? " §r§2└─§o§7" : " §r§2├─§o§7"} ${toTitleCase(key.replace(/_settings$/, "").replace(/_/g, " "))}`;

                const settingsLines = Object.entries(settings).map(([settingName, value], settingIndex, settingsArray) => {
                    const prefix = isLastModule ? `${settingIndex === settingsArray.length - 1 ? "    §r§2└─§o§7 " : "    §r§2├─§o§7 "}` : `§r§2│  ${settingIndex === settingsArray.length - 1 ? "§r§2└─§o§7 " : "§r§2├─§o§7 "}`;
                    return `    ${prefix}${toTitleCase(settingName.replace(/_/g, " "))}: ${value}`;
                });

                moduleStatuses.push(moduleTitle, ...settingsLines);
            });
        }

        // Send the status messages to the player
        player.sendMessage(moduleStatuses.join("\n"));
    },
};
