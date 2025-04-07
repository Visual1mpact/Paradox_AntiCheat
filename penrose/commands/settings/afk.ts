import { ChatSendBeforeEvent, system } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { startAFKChecker, stopAFKChecker } from "../../modules/afk";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

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
    icon: "textures/ui/clock.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "AFK Module Settings",
        description: "Configure the AFK check module to automatically kick players who are AFK.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Set AFK Timer",
                requiredFields: ["afkSettings"],
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
                placeholder: "Set AFK Timeout (Hours):",
                requiredFields: ["afkSettings"],
            },
            {
                name: "Minutes",
                arg: undefined,
                type: "text",
                placeholder: "Set AFK Timeout (Minutes):",
                requiredFields: ["afkSettings"],
            },
            {
                name: "Seconds",
                arg: undefined,
                type: "text",
                placeholder: "Set AFK Timeout (Seconds):",
                requiredFields: ["afkSettings"],
            },
        ],
    },

    /**
     * Executes the AFK command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     */
    execute: (message: ChatSendBeforeEvent, args: string[]) => {
        const player = message.sender;

        // Default values
        let hours = 0;
        let minutes = 10; // Default AFK timeout: 10 minutes
        let seconds = 0;

        const afkKey = "afkCheck_b";
        const afkSettingsKey = "afk_settings";

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
