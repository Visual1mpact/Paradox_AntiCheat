import { ChatSendBeforeEvent, world, WeatherType } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";

/**
 * Represents the environment command.
 * Allows administrators to change the time and weather of the world.
 */
export const environmentCommand: Command = {
    name: "environment",
    description: "Changes the world's time and weather.",
    usage: "{prefix}environment <time | weather> <value>",
    examples: [`{prefix}environment time day`, `{prefix}environment time midnight`, `{prefix}environment weather rain`, `{prefix}environment weather clear`],
    category: "Utility",
    securityClearance: 4,
    icon: "textures/ui/timer.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Environment Control",
        description:
            "Modify the world's temporal and atmospheric conditions.\n\n" +
            "§7• §fTime Control§7: Shift the sun or moon to specific presets.\n" +
            "§7• §fWeather Control§7: Manipulate precipitation and storm states.\n\n" +
            "§7Note: Changes take effect immediately across all dimensions where applicable.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Set Time",
                command: ["time"],
                description: "Change the current time of day.",
                requiredFields: ["timeValue"],
                generateModalForm: true,
                icon: "textures/ui/time_2day.png",
            },
            {
                name: "Set Weather",
                command: ["weather"],
                description: "Change the current weather state.",
                requiredFields: ["weatherValue"],
                generateModalForm: true,
                icon: "textures/ui/weather_clear.png",
            },
        ],
        dynamicFields: [
            {
                name: "\nSelect Time:",
                type: "dropdown",
                options: ["Sunrise", "Day", "Noon", "Sunset", "Night", "Midnight"],
                requiredFields: ["timeValue"],
            },
            {
                name: "\nSelect Weather:",
                type: "dropdown",
                options: ["Clear", "Rain", "Thunder"],
                requiredFields: ["weatherValue"],
            },
        ],
    },

    execute: (message?: ChatSendBeforeEvent, args: string[] = []): Promise<boolean> => {
        if (!message) return Promise.resolve(false);

        const type = args[0]?.toLowerCase();
        const value = args[1]?.toLowerCase();

        if (type === "time") {
            const timeMap: Record<string, number> = {
                sunrise: 0,
                day: 1000,
                noon: 6000,
                sunset: 12000,
                night: 13000,
                midnight: 18000,
            };

            const timeTick = value === undefined ? undefined : timeMap[value];
            if (timeTick !== undefined) {
                world.setTimeOfDay(timeTick);
                message.sender.sendMessage(`§2[§7Paradox§2]§o§7 World time set to §a${value}§7.`);
                return Promise.resolve(true);
            }
        }

        if (type === "weather") {
            const dimension = message.sender.dimension;
            switch (value) {
                case "clear":
                    dimension.setWeather(WeatherType.Clear);
                    message.sender.sendMessage("§2[§7Paradox§2]§o§7 Weather set to §aclear§7.");
                    return Promise.resolve(true);
                case "rain":
                    dimension.setWeather(WeatherType.Rain);
                    message.sender.sendMessage("§2[§7Paradox§2]§o§7 Weather set to §arain§7.");
                    return Promise.resolve(true);
                case "thunder":
                    dimension.setWeather(WeatherType.Thunder);
                    message.sender.sendMessage("§2[§7Paradox§2]§o§7 Weather set to §athunder§7.");
                    return Promise.resolve(true);
                default:
                    break;
            }
        }

        message.sender.sendMessage("§o§c[Paradox] Invalid arguments. Use:\n" + "§7:environment time <sunrise|day|noon|sunset|night|midnight>\n" + "§7:environment weather <clear|rain|thunder>");
        return Promise.resolve(false);
    },
};
