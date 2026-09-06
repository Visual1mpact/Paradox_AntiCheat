import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { startVisionCheck, stopVisionCheck } from "../../modules/vision-module";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

const MODULE_KEY = "visionCheck_b";

/**
 * Represents the vision check command.
 */
export const visionCheckCommand: Command = {
    name: "visioncheck",
    description: "Toggles the vision check module.",
    usage: "{prefix}visioncheck [ help ]",
    examples: [`{prefix}visioncheck`, `{prefix}visioncheck help`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/items/spyglass.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Vision Check Settings",
        description:
            "Enable or disable the Vision Check module to allow security personnel to inspect container contents remotely.\n\n" +
            "§7• Peer into containers from a distance without physical interaction.\n" +
            "§7• Useful for verifying suspected illegal items or distribution patterns.\n" +
            "§7• All remote access events are logged for administrative transparency.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/items/spyglass.png",
                description: "Toggle the Vision Check module on or off.",
            },
        ],
    },

    execute: async (message?: ChatSendBeforeEvent): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const moduleData = (await paradoxModulesDB.get(MODULE_KEY)) ?? {
            enabled: false,
        };
        const isEnabled = !moduleData.enabled;
        moduleData.enabled = isEnabled;

        if (isEnabled) {
            startVisionCheck();
            player.sendMessage(`§2[§7Paradox§2]§o§7 Vision check has been §aenabled§7.`);
        } else {
            stopVisionCheck();
            player.sendMessage(`§2[§7Paradox§2]§o§7 Vision check has been §4disabled§7.`);
        }

        await paradoxModulesDB.set(MODULE_KEY, moduleData);
    },
};
