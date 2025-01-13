import { ChatSendBeforeEvent, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
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
    icon: "textures/ui/slowness_effect.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Lag Clear Module Settings",
        description: "Configure the Lag Clear module to automatically clear items and entities with a custom timer. Specify hours, minutes, and seconds to set the delay for the clearing operation.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Set LagClear Timer",
                requiredFields: ["lagClearSettings"],
                command: undefined,
                generateModalForm: true,
                icon: "textures/ui/multiselection.png",
            },
            {
                name: "Enable / Disable",
                command: undefined,
                icon: "textures/ui/clock.png",
            },
        ],
        dynamicFields: [
            {
                name: "Hours",
                arg: undefined,
                type: "text",
                placeholder: "Set Lag Clear Timer (Hours):",
                requiredFields: ["lagClearSettings"],
            },
            {
                name: "Minutes",
                arg: undefined,
                type: "text",
                placeholder: "Set Lag Clear Timer (Minutes):",
                requiredFields: ["lagClearSettings"],
            },
            {
                name: "Seconds",
                arg: undefined,
                type: "text",
                placeholder: "Set Lag Clear Timer (Seconds):",
                requiredFields: ["lagClearSettings"],
            },
        ],
    },

    /**
     * Executes the lagclear command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent, args: string[]) => {
        const player = message.sender;

        // Keys for lag clear settings in the database
        const lagClearKey = "lagClearCheck_b";
        const lagClearSettingsKey = "lagClear_settings";

        // Default values
        let hours = 0;
        let minutes = 10; // Default timeout: 10 minutes
        let seconds = 0;

        /**
         * Safely parses a string into a number, returning a default value if parsing fails.
         *
         * @param {string | undefined} value - The string value to parse. Can be undefined or invalid.
         * @param {number} [defaultValue=0] - The default value to return if the input is not a valid number.
         * @returns {number} The parsed number, or the default value if the input is invalid.
         *
         * @example
         * parseNumber("42"); // Returns 42
         * parseNumber("abc", 10); // Returns 10
         * parseNumber(undefined, 5); // Returns 5
         */
        const parseNumber = (value: string | undefined, defaultValue: number = 0): number => {
            const parsed = parseInt(value ?? "", 10);
            return isNaN(parsed) ? defaultValue : parsed;
        };

        /**
         * Determines the timeout values (hours, minutes, seconds) based on input arguments.
         * Defaults to 10 minutes if all arguments are invalid or undefined.
         *
         * @param {string[]} args - The command arguments for hours, minutes, and seconds.
         * @returns {{ hours: number; minutes: number; seconds: number }} The parsed or defaulted timeout values.
         */
        const getTimeoutValues = (args: string[]): { hours: number; minutes: number; seconds: number } => {
            const hours = parseNumber(args[0], 0);
            const minutes = parseNumber(args[1], 0);
            const seconds = parseNumber(args[2], 0);

            // Default to 10 minutes if all arguments are invalid or undefined
            if (hours === 0 && minutes === 0 && seconds === 0 && args.every((arg) => isNaN(parseInt(arg ?? "", 10)))) {
                return { hours: 0, minutes: 10, seconds: 0 };
            }

            return { hours, minutes, seconds };
        };

        if (args.length === 3) {
            // Determine the timeout values
            const { hours, minutes, seconds } = getTimeoutValues(args);

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
