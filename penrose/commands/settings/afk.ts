import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startAFKChecker, stopAFKChecker } from "../../modules/afk";
import { paradoxModulesDB } from "../../paradox";

/**
 * Represents the AFK command.
 */
export const afkCommand: Command = {
    name: "afk",
    description: `Toggles the AFK check module, which kicks players that are AFK.`,
    usage: "{prefix}afk [ hours ] [ minutes ] [ seconds ]",
    examples: [`{prefix}afk`, `{prefix}afk 0 10 0`, `{prefix}afk 0 15 30`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the AFK command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const system = minecraftEnvironment.getSystem();

        // Default values
        let hours = 0;
        let minutes = 10; // Default AFK timeout: 10 minutes
        let seconds = 0;

        const afkKey = "afkCheck_b";
        const afkSettingsKey = "afk_settings";

        if (args.length === 3) {
            // Parse arguments for custom settings
            hours = parseInt(args[0], 10) ?? 0;
            minutes = parseInt(args[1], 10) ?? 0;
            seconds = parseInt(args[2], 10) ?? 0;

            // Update settings and enable the module
            paradoxModulesDB.set(afkSettingsKey, { hours, minutes, seconds });
            paradoxModulesDB.set(afkKey, true);
            player.sendMessage(`§2[§7Paradox§2]§o§7 AFK timer updated to §2[ §7${hours}§7 : §7${minutes}§7 : §7${seconds}§7 §2]§7.`);

            // Restart AFK checker with the new settings
            system.run(() => {
                startAFKChecker(hours, minutes, seconds);
            });
        } else {
            // Retrieve current settings from the database
            const settings = (paradoxModulesDB.get(afkSettingsKey) as { hours: number; minutes: number; seconds: number }) ?? { hours, minutes, seconds };
            hours = settings.hours;
            minutes = settings.minutes;
            seconds = settings.seconds;

            const isAFKEnabled = (paradoxModulesDB.get(afkKey) as boolean) ?? false;

            if (!isAFKEnabled) {
                // Enable AFK module
                paradoxModulesDB.set(afkKey, true);
                paradoxModulesDB.set(afkSettingsKey, { hours, minutes, seconds });
                player.sendMessage("§2[§7Paradox§2]§o§7 AFK module has been §aenabled§7.");

                // Start the AFK checker
                system.run(() => {
                    startAFKChecker(hours, minutes, seconds);
                });
            } else {
                // Disable AFK module
                paradoxModulesDB.set(afkKey, false);
                player.sendMessage("§2[§7Paradox§2]§o§7 AFK module has been §4disabled§7.");

                // Stop the AFK checker
                system.run(() => {
                    stopAFKChecker();
                });
            }
        }
    },
};
