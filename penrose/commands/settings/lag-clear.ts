import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startLagClear, stopLagClear } from "../../modules/lag-clear";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

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
    icon: "textures/ui/slowness_effect.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Lag Clear Module Settings",
        description:
            "Manage the Lag Clear module to automatically remove excess items and entities from the world.\n\n" +
            "§7• §fSet LagClear Timer§7: Define the interval for automatic clearing by specifying hours, minutes, and seconds.\n" +
            "§7• §fEnable / Disable Module§7: Turn the Lag Clear system on or off.\n\n" +
            "§7Lag Clear Rules:\n" +
            "§7• Default timer is 10 minutes if no arguments are provided.\n" +
            "§7• Timer settings persist across server restarts.\n" +
            "§7• Only administrators with clearance level 4 can modify or execute LagClear commands.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Set LagClear Timer",
                requiredFields: ["lagClearSettings"],
                generateModalForm: true,
                icon: "textures/ui/multiselection.png",
            },
            {
                name: "Enable / Disable",
                icon: "textures/ui/clock.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nSet Lag Clear Timer (Hours):",
                type: "text",
                placeholder: "Hours",
                requiredFields: ["lagClearSettings"],
            },
            {
                name: "\nSet Lag Clear Timer (Minutes):",
                type: "text",
                placeholder: "Minutes",
                requiredFields: ["lagClearSettings"],
            },
            {
                name: "\nSet Lag Clear Timer (Seconds):",
                type: "text",
                placeholder: "Seconds",
                requiredFields: ["lagClearSettings"],
            },
        ],
    },

    /**
     * Executes the lagclear command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     * @param {string[]} [args] - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args: string[] = []): Promise<void> => {
        if (!message) return;
        const player = message.sender;
        const moduleKey = "lagClearCheck_b";

        /**
         * Parses a string to a number or returns a default fallback.
         *
         * @param {string | undefined} value - String value to parse.
         * @param {number} [fallback=0] - Default value if parsing fails.
         * @returns {number}
         */
        const parseNumber = (value: string | undefined, fallback: number = 0): number => {
            const parsed = parseInt(value ?? "", 10);
            return isNaN(parsed) ? fallback : parsed;
        };

        /**
         * Resolves the timer from provided args or returns a default 10-minute timer.
         *
         * @param {string[]} args - Input arguments.
         * @returns {{ hours: number, minutes: number, seconds: number }}
         */
        const getTimeout = (args: string[]) => {
            const hours = parseNumber(args[0]);
            const minutes = parseNumber(args[1]);
            const seconds = parseNumber(args[2]);

            const allInvalid = hours === 0 && minutes === 0 && seconds === 0 && args.every((a) => isNaN(parseInt(a ?? "", 10)));
            return allInvalid ? { hours: 0, minutes: 10, seconds: 0 } : { hours, minutes, seconds };
        };

        const moduleData = paradoxModulesDB.get(moduleKey) ?? {
            enabled: false,
            settings: { hours: 0, minutes: 10, seconds: 0 },
        };

        // If arguments are provided: update the timer and enable the module
        if (args.length >= 1 && args.length <= 3) {
            const newSettings = getTimeout(args);

            await paradoxModulesDB.set(moduleKey, {
                enabled: true,
                settings: newSettings,
            });

            player.sendMessage(`§2[§7Paradox§2]§o§7 LagClear timer set to §2[ §sH: §7${newSettings.hours} §sM: §7${newSettings.minutes} §sS: §7${newSettings.seconds} §2]§7.`);
            startLagClear(newSettings.hours, newSettings.minutes, newSettings.seconds);
            return;
        }

        // No args: toggle the module on/off
        if (!moduleData?.enabled) {
            const settings = moduleData?.settings ?? { hours: 0, minutes: 10, seconds: 0 };

            await paradoxModulesDB.set(moduleKey, {
                enabled: true,
                settings,
            });

            player.sendMessage("§2[§7Paradox§2]§o§7 LagClear has been §aenabled§7.");
            startLagClear(settings.hours, settings.minutes, settings.seconds);
        } else {
            await paradoxModulesDB.set(moduleKey, {
                ...moduleData,
                enabled: false,
            });

            player.sendMessage("§2[§7Paradox§2]§o§7 LagClear has been §4disabled§7.");
            stopLagClear();
        }
    },
};
