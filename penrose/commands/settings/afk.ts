import { ChatSendBeforeEvent } from "@minecraft/server";
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
                name: "\nSet AFK Timeout (Hours):",
                type: "text",
                placeholder: "Hours",
                requiredFields: ["afkSettings"],
            },
            {
                name: "\nSet AFK Timeout (Minutes):",
                type: "text",
                placeholder: "Minutes",
                requiredFields: ["afkSettings"],
            },
            {
                name: "\nSet AFK Timeout (Seconds):",
                type: "text",
                placeholder: "Seconds",
                requiredFields: ["afkSettings"],
            },
        ],
    },

    /**
     * Executes the AFK command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent, args: string[]): Promise<void> => {
        const player = message.sender;
        const afkKey = "afkCheck_b";

        /**
         * Parses a number from a string, returning a fallback default if parsing fails.
         *
         * @param {string | undefined} value - Input string to parse.
         * @param {number} [defaultValue=0] - Fallback if parsing fails.
         * @returns {number} Parsed number or fallback.
         */
        const parseNumber = (value: string | undefined, defaultValue: number = 0): number => {
            const parsed = parseInt(value ?? "", 10);
            return isNaN(parsed) ? defaultValue : parsed;
        };

        /**
         * Extracts timeout values (hours, minutes, seconds) from command arguments.
         *
         * @param {string[]} args - Argument list.
         * @returns {{ hours: number; minutes: number; seconds: number }} Parsed timeout values.
         */
        const getTimeoutValues = (args: string[]): { hours: number; minutes: number; seconds: number } => {
            const hours = parseNumber(args[0], 0);
            const minutes = parseNumber(args[1], 0);
            const seconds = parseNumber(args[2], 0);

            const allInvalid = hours === 0 && minutes === 0 && seconds === 0 && args.every((arg) => isNaN(parseInt(arg ?? "", 10)));
            return allInvalid ? { hours: 0, minutes: 10, seconds: 0 } : { hours, minutes, seconds };
        };

        // Load existing module data or set default if missing
        let moduleData = paradoxModulesDB.get(afkKey) ?? {
            enabled: false,
            settings: { hours: 0, minutes: 10, seconds: 0 },
        };

        if (args.length >= 1 && args.length <= 3) {
            // Update and enable the module with new timeout settings
            const { hours, minutes, seconds } = getTimeoutValues(args);
            moduleData = {
                enabled: true,
                settings: { hours, minutes, seconds },
            };

            await paradoxModulesDB.set(afkKey, moduleData);
            player.sendMessage(`§2[§7Paradox§2]§o§7 AFK timer updated to §2[ §sH: §7${hours} §sM: §7${minutes} §sS: §7${seconds} §2]§7.`);
            startAFKChecker(hours, minutes, seconds);
        } else {
            // Toggle enabled state
            const isEnabled = moduleData.enabled ?? false;
            const settings = moduleData.settings ?? { hours: 0, minutes: 10, seconds: 0 };

            if (!isEnabled) {
                moduleData.enabled = true;
                moduleData.settings = settings;
                await paradoxModulesDB.set(afkKey, moduleData);
                player.sendMessage("§2[§7Paradox§2]§o§7 AFK module has been §aenabled§7.");
                startAFKChecker(settings.hours, settings.minutes, settings.seconds);
            } else {
                moduleData.enabled = false;
                await paradoxModulesDB.set(afkKey, moduleData);
                player.sendMessage("§2[§7Paradox§2]§o§7 AFK module has been §4disabled§7.");
                stopAFKChecker();
            }
        }
    },
};
