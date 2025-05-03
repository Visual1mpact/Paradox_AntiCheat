import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
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
        description: "Enable or disable the rate-limit detection module to prevent players from sending too many packets [BDS Only].\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                command: undefined,
                icon: "textures/ui/keyboard_and_mouse_glyph_color.png",
            },
        ],
    },

    /**
     * Executes the rate-limit detection command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} _ - The command arguments.
     */
    execute: async (message: ChatSendBeforeEvent, _: string[]) => {
        const player = message.sender;

        // Get rate-limit detection status from the database
        const rateLimitEnabled = (paradoxModulesDB.get("rateLimitCheck_b") as boolean) ?? false;

        if (!rateLimitEnabled) {
            // Enable the module
            paradoxModulesDB.set("rateLimitCheck_b", true);

            const success = await startPacketHandler(); // Attempt to start the packet handler
            if (success) {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Rate-limit detection has been §aenabled§7.`);
            } else {
                // Revert the database change if enabling failed
                paradoxModulesDB.set("rateLimitCheck_b", false);
                player.sendMessage(`§2[§7Paradox§2]§o§7 Rate-limit detection could not be enabled: §c@minecraft/server-net not found§7.`);
            }
        } else {
            // Disable the module
            paradoxModulesDB.set("rateLimitCheck_b", false);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Rate-limit detection has been §4disabled§7.`);

            stopPacketHandler(); // Stop the packet handler
        }
    },
};
