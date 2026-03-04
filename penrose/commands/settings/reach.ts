import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startHitReachCheck, stopHitReachCheck } from "../../modules/reach";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the hit reach detection command.
 */
export const hitReachCheckCommand: Command = {
    name: "reach",
    description: "Toggles the module that checks if players are hit from a fair distance.",
    usage: "{prefix}reach [ help ]",
    examples: [`{prefix}reach`, `{prefix}reach help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/permissions_visitor_hand.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Hit Reach Detection Settings",
        description: "Enable or disable the reach detection module to prevent players from hitting others from an unfair distance.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/permissions_visitor_hand.png",
            },
        ],
    },

    /**
     * Executes the hit reach detection command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} _ - The command arguments.]
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent | undefined, _?: string[]): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const hitReachCheckKey = "hitReachCheck_b";

        // Retrieve the current state from paradoxModulesDB
        const moduleData = paradoxModulesDB.get(hitReachCheckKey) ?? {
            enabled: false,
        };
        const hitReachCheckEnabled = moduleData?.enabled ?? false;

        if (!hitReachCheckEnabled) {
            // Enable the module
            moduleData.enabled = true;
            await paradoxModulesDB.set(hitReachCheckKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Hit reach detection has been §aenabled§7.`);
            startHitReachCheck();
        } else {
            // Disable the module
            moduleData.enabled = false;
            await paradoxModulesDB.set(hitReachCheckKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 Hit reach detection has been §4disabled§7.`);
            stopHitReachCheck();
        }
    },
};
