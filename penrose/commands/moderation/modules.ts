import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { commandHandler, paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the modules status command.
 */
export const modulesStatusCommand: Command = {
    name: "modules",
    description: "Shows the status of all modules.",
    usage: "{prefix}modules [ help ]",
    examples: [`{prefix}modules`, `{prefix}modules help`],
    category: "Moderation",
    securityClearance: 4,
    icon: "textures/ui/invertedmultiselecticon.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Modules Status Command",
        description: "Displays the status of all registered modules, including whether they are enabled or disabled, and the settings for each module.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "View Enabled Modules",
                description: "Shows only the modules that are currently enabled.",
                icon: "textures/items/book_writable.png",
            },
        ],
    },

    /**
     * Executes the modules status command.
     * @param {ChatSendBeforeEvent | undefined} message - The message object.
     */
    execute: (message?: ChatSendBeforeEvent) => {
        if (!message) return;
        const player = message.sender;

        const status = (enabled: boolean) => (enabled ? "§aENABLED" : "§4DISABLED");
        const toTitleCase = (str: string) =>
            str
                .replace(/([A-Z])/g, " $1")
                .replace(/_/g, " ")
                .replace(/^./, (char) => char.toUpperCase());

        const registeredCommandNames = commandHandler.getRegisteredCommands().map((cmd) => cmd.name);

        const moduleToCommandMap: Record<string, string> = {
            afkCheck_b: "afk",
            gamemodeCheck_b: "gamemode",
            autoClickerCheck_b: "autoclicker",
            flyCheck_b: "antifly",
            killAuraCheck_b: "killaura",
            scaffoldCheck_b: "scaffold",
            nameSpoofCheck_b: "namespoof",
            xrayDetection_b: "xray",
            selfAttackCheck_b: "selfattack",
            rateLimitCheck_b: "ratelimit",
            packetMonitorCheck_b: "packetmonitor",
            visionCheck_b: "visioncheck",
            lagClearCheck_b: "lagclear",
            platformBlock_b: "platformblock",
            hitReachCheck_b: "reach",
            spamCheck_b: "antispam",
            worldBorderCheck_b: "worldborder",
            invSync_b: "invsync",
        };

        const entries = paradoxModulesDB.entries();

        // Filter only modules that have registered commands
        const filteredModules = entries.filter(([key]) => {
            const commandName = moduleToCommandMap[key];
            return commandName && registeredCommandNames.includes(commandName);
        });

        const lines: string[] = [];
        lines.push("§2[§7Paradox§2]§o§7 Registered Modules:");

        if (filteredModules.length === 0) {
            lines.push("§r§2  └─§o§7 No matching module commands found.");
        } else {
            filteredModules.forEach(([key, value], index) => {
                const commandName = moduleToCommandMap[key];
                const isLast = index === filteredModules.length - 1;
                const branch = isLast ? "└" : "├";
                const readableName = toTitleCase(commandName);
                const enabled = value?.enabled ?? false;

                lines.push(`§r§2 ${branch}─§o§7 ${readableName}: ${status(enabled)}`);

                // Show settings
                if (value?.settings && typeof value.settings === "object") {
                    const settingsEntries = Object.entries(value.settings);
                    settingsEntries.forEach(([settingName, settingValue], i) => {
                        const settingBranch = i === settingsEntries.length - 1 ? "└" : "├";
                        const settingIndent = isLast ? "    " : "│   ";
                        lines.push(`§r§2 ${settingIndent}${settingBranch}─§o§7 ${toTitleCase(settingName)}: ${settingValue}`);
                    });
                }
            });
        }

        player.sendMessage(lines.join("\n"));
    },
};
