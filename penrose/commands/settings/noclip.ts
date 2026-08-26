import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { startNoClip, stopNoClip } from "../../modules/noclip-module";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Command to toggle the NoClip detection module.
 * Allows Level 4 staff to enable or disable anti-phase detection
 * for players. Supports GUI and chat execution.
 */
export const noClipCommand: Command = {
    name: "noclip",
    description: "Toggles the NoClip detection module.",
    usage: "{prefix}noclip",
    examples: [`{prefix}noclip`, `{prefix}noclip help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/weaving_effect.png",

    /**
     * Instructions for the in-game GUI form.
     * @type {object}
     */
    guiInstructions: {
        formType: "ActionFormData",
        title: "NoClip Detection Settings",
        description:
            "Prevent players from bypassing physical collisions or phasing through solid blocks.\n\n" +
            "§7• Utilizes swept-AABB checks to detect illegal coordinate transitions.\n" +
            "§7• Tracks movement history to distinguish between lag and exploits.\n" +
            "§7• Automatically reverts suspicious position packets to maintain server integrity.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/absorption_effect.png",
                description: "Toggle the NoClip detection module on or off.",
            },
        ],
    },

    /**
     * Executes the NoClip command.
     * Toggles the NoClip module on/off and updates the database.
     *
     * @param {ChatSendBeforeEvent} [message] - The chat event that triggered the command.
     * @param {string[]} [_] - Command arguments (optional, not used here).
     * @returns {Promise<void>} - Resolves when the module is toggled.
     */
    execute: async (message?: ChatSendBeforeEvent, _: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        // Retrieve current module state from the database
        const moduleData = (await paradoxModulesDB.get("noClipCheck_b")) ?? { enabled: false };
        const isEnabled = moduleData?.enabled ?? false;

        if (!isEnabled) {
            // Enable NoClip detection
            moduleData.enabled = true;
            await paradoxModulesDB.set("noClipCheck_b", moduleData);
            startNoClip();
            player.sendMessage("§2[§7Paradox§2]§o§7 NoClip detection has been §aenabled§7.");
        } else {
            // Disable NoClip detection
            moduleData.enabled = false;
            await paradoxModulesDB.set("noClipCheck_b", moduleData);
            stopNoClip();
            player.sendMessage("§2[§7Paradox§2]§o§7 NoClip detection has been §4disabled§7.");
        }
    },
};
