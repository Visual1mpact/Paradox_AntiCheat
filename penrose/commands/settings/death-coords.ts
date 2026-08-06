import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startDeathCoords, stopDeathCoords } from "../../modules/death-coords";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Command to toggle the Death Coordinates module.
 * Sends players their coordinates upon death to help them find their items.
 */
export const deathCoordsCommand: Command = {
    name: "deathcoords",
    description: "Toggles the Death Coordinates notification module.",
    usage: "{prefix}deathcoords",
    examples: [`{prefix}deathcoords`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/barely_visible_creeper.png",

    /**
     * Instructions for the in-game GUI form.
     */
    guiInstructions: {
        formType: "ActionFormData",
        title: "Death Coordinates Settings",
        description:
            "Automatically notify players of their coordinates and dimension when they die.\n\n" +
            "§7• Helps players recover lost items quickly.\n" +
            "§7• Sends a private message to the deceased player.\n" +
            "§7• Can be toggled on or off globally by administrators.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable / Disable",
                icon: "textures/ui/refresh_light.png",
                description: "Toggle the Death Coordinates module on or off.",
            },
        ],
    },

    /**
     * Executes the Death Coordinates toggle command.
     *
     * @param {ChatSendBeforeEvent} [message] - The chat event that triggered the command.
     * @param {string[]} [_] - Command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, _: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        // Retrieve current module state from the database
        const moduleData = (await paradoxModulesDB.get("deathCoords_b")) ?? { enabled: false };
        const isEnabled = moduleData?.enabled ?? false;

        if (!isEnabled) {
            // Enable the module
            moduleData.enabled = true;
            await paradoxModulesDB.set("deathCoords_b", moduleData);
            startDeathCoords();
            player.sendMessage("§2[§7Paradox§2]§o§7 Death Coordinates has been §aenabled§7.");
        } else {
            // Disable the module
            moduleData.enabled = false;
            await paradoxModulesDB.set("deathCoords_b", moduleData);
            stopDeathCoords();
            player.sendMessage("§2[§7Paradox§2]§o§7 Death Coordinates has been §4disabled§7.");
        }
    },
};
