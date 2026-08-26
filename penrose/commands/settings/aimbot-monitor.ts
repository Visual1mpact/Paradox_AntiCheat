import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { startAimbotMonitor, stopAimbotMonitor } from "../../modules/aimbot-monitor-module";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the aimbot monitoring command.
 */
export const aimbotMonitorCommand: Command = {
    name: "aimbotmonitor",
    description: "Toggles the aimbot monitoring module to detect external rotation smoothing cheats.",
    usage: "{prefix}aimbotmonitor [ help ]",
    examples: [`{prefix}aimbotmonitor`, `{prefix}aimbotmonitor help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/items/spyglass.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Aimbot Monitoring Settings",
        description:
            "Analyze player rotation patterns to identify external aim-assist and smoothing software.\n\n" +
            "§7• Detects mathematical consistency in view movement characteristic of scripts.\n" +
            "§7• Monitors combat tracking precision against the server-side entity registry.\n" +
            "§7• Flags suspicious behavioral signatures for administrative review.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/items/repeater.png",
                description: "Toggle the aimbot monitoring module on or off.",
            },
        ],
    },

    /**
     * Executes the aimbot monitoring command.
     * @param message - Optional chat message event
     */
    execute: async (message?: ChatSendBeforeEvent): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        // Get monitoring status from the database
        const moduleData = (await paradoxModulesDB.get("aimbotMonitorCheck_b")) ?? {
            enabled: false,
        };
        const aimbotMonitorEnabled = moduleData?.enabled ?? false;

        if (!aimbotMonitorEnabled) {
            // Enable the module
            moduleData.enabled = true;
            await paradoxModulesDB.set("aimbotMonitorCheck_b", moduleData);

            const success = await startAimbotMonitor();
            if (success) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Aimbot monitoring has been §aenabled§7.`);
            } else {
                // Revert the database change if enabling failed
                moduleData.enabled = false;
                await paradoxModulesDB.set("aimbotMonitorCheck_b", moduleData);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Aimbot monitoring could not be enabled.`);
            }
        } else {
            // Disable the module
            moduleData.enabled = false;
            await paradoxModulesDB.set("aimbotMonitorCheck_b", moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Aimbot monitoring has been §4disabled§7.`);

            stopAimbotMonitor();
        }
    },
};
