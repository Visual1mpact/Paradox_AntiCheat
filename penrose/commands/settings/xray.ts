import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startXrayDetection, stopXrayDetection } from "../../modules/xray";
import { paradoxModulesDB } from "../../paradox";

/**
 * Represents the Xray detection command.
 */
export const xrayCommand: Command = {
    name: "xray",
    description: "Toggles the Xray detection module.",
    usage: "{prefix}xray [ help ]",
    examples: [`{prefix}xray`, `{prefix}xray help`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the Xray detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, _: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const system = minecraftEnvironment.getSystem();

        // Get current Xray detection module state from paradoxModulesDB
        const xrayEnabled = paradoxModulesDB.get("xrayDetection_b") ?? false; // Default to false if not set

        if (!xrayEnabled) {
            // Enable the Xray detection module
            paradoxModulesDB.set("xrayDetection_b", true); // Update the state in the database
            player.sendMessage(`§2[§7Paradox§2]§o§7 Xray detection has been §aenabled§7.`);
            system.run(() => {
                startXrayDetection(); // Start Xray detection
            });
        } else {
            // Disable the Xray detection module
            paradoxModulesDB.set("xrayDetection_b", false); // Update the state in the database
            player.sendMessage(`§2[§7Paradox§2]§o§7 Xray detection has been §4disabled§7.`);
            system.run(() => {
                stopXrayDetection(); // Stop Xray detection
            });
        }
    },
};
