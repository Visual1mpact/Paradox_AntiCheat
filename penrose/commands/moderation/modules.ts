import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
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
        description:
            "View and manage the operational status of all registered Paradox AntiCheat modules.\n\n" +
            "§7• Monitor which protection systems are currently active or deactivated.\n" +
            "§7• Inspect specific configuration settings for each module (timers, thresholds, etc.).\n" +
            "§7• Only displays modules with registered commands to ensure UI clarity.\n" +
            "§7• Requires Level 4 security clearance for full system visibility.\n\n",
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
    execute: async (message?: ChatSendBeforeEvent) => {
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
            aimbotMonitorCheck_b: "aimbotmonitor",
            antiCrashCheck_b: "anticrash",
            autoClickerCheck_b: "autoclicker",
            autoTotemCheck_b: "autototem",
            chestLock_b: "chestforensic",
            criticalsCheck_b: "criticals",
            deathCoords_b: "deathcoords",
            dimensionLock_b: "dimensionlock",
            flyCheck_b: "antifly",
            gamemodeCheck_b: "gamemode",
            graveSaver_b: "gravesaver",
            hitReachCheck_b: "reach",
            invSync_b: "invsync",
            killAuraCheck_b: "killaura",
            lagClearCheck_b: "lagclear",
            nameSpoofCheck_b: "namespoof",
            noClipCheck_b: "noclip",
            packetMonitorCheck_b: "packetmonitor",
            pathingCheck_b: "pathing",
            platformBlock_b: "platformblock",
            rateLimitCheck_b: "ratelimit",
            scaffoldCheck_b: "scaffold",
            selfAttackCheck_b: "selfattack",
            spamCheck_b: "antispam",
            visionCheck_b: "visioncheck",
            worldBorderCheck_b: "worldborder",
            xrayDetection_b: "xray",
            invalidMovementVectorCheck_b: "invalidvector",
            inventoryMovementCheck_b: "invmove",
            hotbarCheck_b: "hotbarcheck",
        };

        const entries = await paradoxModulesDB.entries();

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
                const commandName = moduleToCommandMap[key]!;
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
