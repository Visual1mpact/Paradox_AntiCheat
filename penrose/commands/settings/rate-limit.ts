import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { startPacketHandler, stopPacketHandler } from "../../modules/rate-limit";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the rate-limit detection command.
 */
export const rateLimitCommand: Command = {
    name: "ratelimit",
    description: "Toggles the rate-limit detection module [BDS Only].",
    usage: "{prefix}ratelimit [ help ]",
    examples: [`{prefix}ratelimit`, `{prefix}ratelimit help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/keyboard_and_mouse_glyph_color.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "RateLimit Detection Settings",
        description:
            "Monitor and regulate network packet flow to prevent server-side lag and exploitation [BDS Only].\n\n" +
            "§7• Enforces per-player and global limits on specific packet types.\n" +
            "§7• Automatically mitigates flooding attempts by canceling packets or applying bans.\n" +
            "§7• Triggers server-wide lockdown during severe bursts to ensure stability.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/keyboard_and_mouse_glyph_color.png",
                description: "Toggle the rate-limit detection module on or off.",
            },
        ],
    },

    /**
     * Executes the rate-limit detection command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} _ - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent | undefined, _?: string[]): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        // Get rate-limit detection status from the database
        const moduleData = (await paradoxModulesDB.get("rateLimitCheck_b")) ?? {
            enabled: false,
        };
        const rateLimitEnabled = moduleData?.enabled ?? false;

        if (!rateLimitEnabled) {
            // Enable the module
            moduleData.enabled = true;
            await paradoxModulesDB.set("rateLimitCheck_b", moduleData);

            const success = await startPacketHandler(); // Attempt to start the packet handler
            if (success) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Rate-limit detection has been §aenabled§7.`);
            } else {
                // Revert the database change if enabling failed
                moduleData.enabled = false;
                await paradoxModulesDB.set("rateLimitCheck_b", moduleData);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Rate-limit detection could not be enabled: §c@minecraft/server-net not found§7.`);
            }
        } else {
            // Disable the module
            moduleData.enabled = false;
            await paradoxModulesDB.set("rateLimitCheck_b", moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Rate-limit detection has been §4disabled§7.`);

            stopPacketHandler(); // Stop the packet handler
        }
    },
};
