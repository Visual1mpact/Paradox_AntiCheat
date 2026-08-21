import { ChatSendBeforeEvent, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { moduleActions, moduleStopActions, paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the command to bulk-enable or bulk-disable modules globally.
 */
export const modStateCommand: Command = {
    name: "modstate",
    description: "Enables or disables all Paradox protection and utility modules at once.",
    usage: "{prefix}modstate [ enable | disable ]",
    examples: ["{prefix}modstate", "{prefix}modstate enable", "{prefix}modstate disable"],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/ui/check.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Bulk Module State Control",
        description:
            "Enable or disable all Paradox protection checks and utility modules concurrently.\n\n" +
            "§7• §fEnable All§7: Starts all registered modules and marks them enabled in the database.\n" +
            "§7• §fDisable All§7: Stops all running module listeners and updates database records.\n\n" +
            "§7Rules & Behavior:\n" +
            "§7• Requires security clearance level 4.\n" +
            "§7• Preserves custom settings and timers when enabling.\n" +
            "§7• Modules already in the target state are skipped automatically.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Enable All Modules",
                command: ["enable"],
                icon: "textures/ui/check.png",
                description: "Activates and starts all Paradox protection modules instantly.",
            },
            {
                name: "Disable All Modules",
                command: ["disable"],
                icon: "textures/ui/cancel.png",
                description: "Stops and deactivates all running Paradox protection modules.",
            },
        ],
    },

    /**
     * Executes the modstate command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} args - Command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const subCommand = args[0]?.toLowerCase().trim();
        const isDisable = subCommand === "disable";

        // Validate that an argument was supplied if run via chat
        if (!subCommand || (subCommand !== "enable" && subCommand !== "disable")) {
            player.sendMessage("§2[§7Paradox§2]§o§c Usage: {prefix}modstate [ enable | disable ]");
            return;
        }

        let modifiedCount = 0;

        for (const [moduleKey, startAction] of Object.entries(moduleActions) as [keyof typeof moduleActions, (settings: Record<string, unknown>) => void][]) {
            const dbKey = moduleKey as Parameters<typeof paradoxModulesDB.get>[0];
            const moduleData: NonNullable<Awaited<ReturnType<typeof paradoxModulesDB.get>>> = (await paradoxModulesDB.get(dbKey)) ?? { enabled: false };

            if (isDisable) {
                // Skip if already disabled
                if (!moduleData.enabled) {
                    continue;
                }

                // Preserve settings object if present while updating enabled status
                await paradoxModulesDB.set(dbKey, {
                    ...moduleData,
                    enabled: false,
                });

                // Stop module runtime logic
                system.run(() => {
                    const stopAction = moduleStopActions[moduleKey];
                    if (stopAction) {
                        stopAction();
                    }
                });

                modifiedCount++;
            } else {
                // Skip if already enabled
                if (moduleData.enabled) {
                    continue;
                }

                // Preserve settings object if present while updating enabled status
                await paradoxModulesDB.set(dbKey, {
                    ...moduleData,
                    enabled: true,
                });

                // Start module runtime logic
                system.run(() => {
                    startAction(moduleData.settings ?? {});
                });

                modifiedCount++;
            }
        }

        if (isDisable) {
            if (modifiedCount === 0) {
                player.sendMessage("§2[§7Paradox§2]§o§7 All modules are already §4disabled§7.");
            } else {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Successfully disabled §4${modifiedCount}§7 module(s).`);
            }
        } else {
            if (modifiedCount === 0) {
                player.sendMessage("§2[§7Paradox§2]§o§7 All modules are already §aenabled§7.");
            } else {
                player.sendMessage(`§2[§7Paradox§2]§o§7 Successfully enabled §a${modifiedCount}§7 module(s).`);
            }
        }
    },
};
