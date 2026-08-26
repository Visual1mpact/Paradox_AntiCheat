import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";
import { startPathingMonitor, stopPathingMonitor } from "../../modules/pathing-monitor-module";

/**
 * Represents the pathing monitor toggle command.
 */
export const pathingCommand: Command = {
    name: "pathing",
    description: "Toggles the pathing and navigation monitor.",
    usage: "{prefix}pathing",
    examples: ["{prefix}pathing"],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/items/compass_item.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Pathing Monitor",
        description:
            "Toggle the Pathing/Navigation detection system.\n\n" +
            "§7• Detects automated movement patterns (Baritone/Navigator).\n" +
            "§7• Monitors for robotic rotation and horizontal speed violations.\n" +
            "§7• Automatically mitigates by resetting player velocity.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Toggle Monitor",
                description: "Enable or disable the pathing detection module.",
                icon: "textures/ui/refresh_light.png",
            },
        ],
    },
    execute: async (message?: ChatSendBeforeEvent) => {
        if (!message) return;
        const player = message.sender;
        const moduleKey = "pathingCheck_b";
        const fetched = await paradoxModulesDB.get(moduleKey);
        const config = (fetched as { enabled: boolean } | undefined) || { enabled: false };

        config.enabled = !config.enabled;
        await paradoxModulesDB.set(moduleKey, config);

        if (config.enabled) {
            startPathingMonitor();
            player.sendMessage("§2[§7Paradox§2]§o§7 Pathing monitor §aENABLED§7.");
        } else {
            stopPathingMonitor();
            player.sendMessage("§2[§7Paradox§2]§o§7 Pathing monitor §4DISABLED§7.");
        }
    },
};
