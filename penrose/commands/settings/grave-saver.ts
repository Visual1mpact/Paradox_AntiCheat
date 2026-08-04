import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startGraveSaver, stopGraveSaver } from "../../modules/grave-saver";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

export const graveSaverCommand: Command = {
    name: "gravesaver",
    description: "Toggles the Grave Saver item preservation module.",
    usage: "{prefix}gravesaver",
    examples: [`{prefix}gravesaver`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/blocks/chest_front.png",

    guiInstructions: {
        formType: "ActionFormData",
        title: "Grave Saver Settings",
        description:
            "Automatically stores a player's inventory items into a safe chest upon death.\n\n" +
            "§7• Prevents items from despawning or burning.\n" +
            "§7• Labels items with custom lore details.\n" +
            "§7• Can be toggled on or off globally by administrators.\n\n",
        commandOrder: "command-arg",
        actions: [{ name: "Enable / Disable", icon: "textures/ui/refresh_light.png", description: "Toggle the Grave Saver module on or off." }],
    },

    execute: async (message?: ChatSendBeforeEvent, _: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const moduleData = paradoxModulesDB.get("graveSaver_b") ?? { enabled: false };
        const isEnabled = moduleData?.enabled ?? false;

        if (!isEnabled) {
            moduleData.enabled = true;
            await paradoxModulesDB.set("graveSaver_b", moduleData);
            startGraveSaver();
            player.sendMessage("§2[§7Paradox§2]§o§7 Grave Saver has been §aenabled§7.");
        } else {
            moduleData.enabled = false;
            await paradoxModulesDB.set("graveSaver_b", moduleData);
            stopGraveSaver();
            player.sendMessage("§2[§7Paradox§2]§o§7 Grave Saver has been §4disabled§7.");
        }
    },
};
