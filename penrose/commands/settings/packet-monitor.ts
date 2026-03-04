import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startPacketListener, stopPacketListener } from "../../modules/packet-monitor";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the packet monitoring command.
 */
export const packetMonitorCommand: Command = {
    name: "packetmonitor",
    description: "Toggles the packet monitoring module to log suspicious packet activity [BDS Only].",
    usage: "{prefix}packetmonitor [ help ]",
    examples: [`{prefix}packetmonitor`, `{prefix}packetmonitor help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/items/comparator.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Packet Monitoring Settings",
        description: "Enable or disable the packet monitoring module to log suspicious packet activity and potential exploits [BDS Only].",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/items/repeater.png",
            },
        ],
    },

    /**
     * Executes the packet monitoring command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object (may be undefined when invoked by a monitor).
     * @param {string[]} [_] - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (
        message?: ChatSendBeforeEvent,
        _?: string[],
        /* eslint-disable @typescript-eslint/no-unused-vars */
        returnMonitorFunction?: boolean
    ): Promise<void> => {
        // read the optional parameter to avoid "declared but its value is never read" compiler warning
        void returnMonitorFunction;

        if (!message) return;
        const player = message.sender;

        // Get packet monitoring status from the database
        const moduleData = paradoxModulesDB.get("packetMonitorCheck_b") ?? {
            enabled: false,
        };
        const packetMonitorEnabled = moduleData?.enabled ?? false;

        if (!packetMonitorEnabled) {
            // Enable the module
            moduleData.enabled = true;
            await paradoxModulesDB.set("packetMonitorCheck_b", moduleData);

            const success = await startPacketListener(); // Attempt to start the packet handler
            if (success) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Packet monitoring has been §aenabled§7.`);
            } else {
                // Revert the database change if enabling failed
                moduleData.enabled = false;
                await paradoxModulesDB.set("packetMonitorCheck_b", moduleData);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Packet monitoring could not be enabled: §c@minecraft/server-net not found§7.`);
            }
        } else {
            // Disable the module
            moduleData.enabled = false;
            await paradoxModulesDB.set("packetMonitorCheck_b", moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Packet monitoring has been §4disabled§7.`);

            stopPacketListener(); // Stop the packet handler
        }
    },
};
