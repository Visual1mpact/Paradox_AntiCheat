import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { startLagClear, stopLagClear } from "../../modules/lag-clear";
import { paradoxModulesDB } from "../../paradox";

/**
 * Represents the lagclear command.
 */
export const lagClearCommand: Command = {
    name: "lagclear",
    description: "Clears items and entities with a timer.",
    usage: "{prefix}lagclear [ hours ] [ minutes ] [ seconds ]",
    examples: [`{prefix}lagclear`, `{prefix}lagclear 0 5 0`, `{prefix}lagclear 0 10 30`],
    category: "Modules",
    securityClearance: 4,

    /**
     * Executes the lagclear command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const system = minecraftEnvironment.getSystem();

        // Keys for lag clear settings in the database
        const lagClearKey = "lagClearCheck_b";
        const lagClearSettingsKey = "lagClear_settings";

        // Default values
        let hours = 0;
        let minutes = 5;
        let seconds = 0;

        if (args.length === 3) {
            // Parse provided arguments
            hours = parseInt(args[0], 10) ?? 0;
            minutes = parseInt(args[1], 10) ?? 0;
            seconds = parseInt(args[2], 10) ?? 0;

            // Update the settings and enable lag clear
            paradoxModulesDB.set(lagClearSettingsKey, { hours, minutes, seconds });
            paradoxModulesDB.set(lagClearKey, true);

            player.sendMessage(`§2[§7Paradox§2]§o§7 LagClear timer updated to §2[ §7${hours}§7 : §7${minutes}§7 : §7${seconds}§7 §2]§7.`);
            system.run(() => {
                startLagClear(hours, minutes, seconds);
            });
        } else {
            // Retrieve current settings
            const currentSettings = paradoxModulesDB.get(lagClearSettingsKey) as { hours: number; minutes: number; seconds: number } | null;
            const lagClearEnabled = paradoxModulesDB.get(lagClearKey) ?? false;

            if (currentSettings) {
                hours = currentSettings.hours;
                minutes = currentSettings.minutes;
                seconds = currentSettings.seconds;
            }

            if (!lagClearEnabled) {
                // Enable LagClear
                paradoxModulesDB.set(lagClearKey, true);
                paradoxModulesDB.set(lagClearSettingsKey, { hours, minutes, seconds });

                player.sendMessage("§2[§7Paradox§2]§o§7 LagClear has been §aenabled§7.");
                system.run(() => {
                    startLagClear(hours, minutes, seconds);
                });
            } else {
                // Disable LagClear
                paradoxModulesDB.set(lagClearKey, false);

                player.sendMessage("§2[§7Paradox§2]§o§7 LagClear has been §4disabled§7.");
                system.run(() => {
                    stopLagClear();
                });
            }
        }
    },
};
