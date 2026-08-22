import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startPacketListener, stopPacketListener } from "../../modules/packet-monitor";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";
import * as CryptoES from "../../node_modules/crypto-es";

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
        description:
            "Audit network traffic to identify potential flooding and remote exploits [BDS Only].\n\n" +
            "§7• Monitors packet frequency per-player to ensure bandwidth stability.\n" +
            "§7• Identifies malformed or out-of-sequence packet signatures.\n" +
            "§7• Logs suspicious network telemetry for forensic analysis.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/items/repeater.png",
                description: "Toggle the packet monitoring module on or off.",
            },
        ],
    },

    /**
     * Executes the packet monitoring command.
     * @param message - Optional chat message event (may be undefined if called by monitor)
     * @param args - Optional array of command arguments
     * @param cryptoES - Optional reference to CryptoES
     * @param returnMonitorFunction - Optional flag indicating monitor invocation
     */
    execute: async (message?: ChatSendBeforeEvent, _args?: string[], _cryptoES?: typeof CryptoES, returnMonitorFunction?: boolean): Promise<void> => {
        // read the optional parameter to avoid "declared but its value is never read" compiler warning
        void returnMonitorFunction;

        if (!message) return;
        const player = message.sender;

        // Get packet monitoring status from the database
        const moduleData = (await paradoxModulesDB.get("packetMonitorCheck_b")) ?? {
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
