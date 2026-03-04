import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

/**
 * Represents the platformBlock command.
 */
export const platformBlockCommand: Command = {
    name: "platformblock",
    description: "Blocks players from joining based on their platform or lists current platform restrictions.",
    usage: "{prefix}platformblock <platform> [ -e | -d | -l | --list ]",
    examples: [`{prefix}platformblock console -e`, `{prefix}platformblock desktop -d`, `{prefix}platformblock mobile --enable`, `{prefix}platformblock -l`],
    category: "Modules",
    securityClearance: 4,
    icon: "textures/ui/xbox4.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Platform Block Settings",
        description: "Select a platform to manage blocking/allowing players.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Console Platform",
                description: "Manage console platform players.\n\n",
                generateSubActions: true, // Flag to trigger nested action form for this platform
                icon: "textures/ui/xbox4.png",
                subActions: [
                    {
                        name: "Enable Console Block",
                        command: ["console", "-e"],
                        description: "Block console platform players from joining.",
                        icon: "textures/ui/realms_green_check.png",
                    },
                    {
                        name: "Disable Console Block",
                        command: ["console", "-d"],
                        description: "Allow console platform players to join.",
                        icon: "textures/ui/realms_red_x.png",
                    },
                ],
            },
            {
                name: "Desktop Platform",
                description: "Manage desktop platform players.\n\n",
                generateSubActions: true, // Flag to trigger nested action form for this platform
                icon: "textures/ui/keyboard_and_mouse_glyph_color.png",
                subActions: [
                    {
                        name: "Enable Desktop Block",
                        command: ["desktop", "-e"],
                        description: "Block desktop platform players from joining.",
                        icon: "textures/ui/realms_green_check.png",
                    },
                    {
                        name: "Disable Desktop Block",
                        command: ["desktop", "-d"],
                        description: "Allow desktop platform players to join.",
                        icon: "textures/ui/realms_red_x.png",
                    },
                ],
            },
            {
                name: "Mobile Platform",
                description: "Manage mobile platform players.\n\n",
                generateSubActions: true, // Flag to trigger nested action form for this platform
                icon: "textures/ui/selecting_items_mobile.png",
                subActions: [
                    {
                        name: "Enable Mobile Block",
                        command: ["mobile", "-e"],
                        description: "Block mobile platform players from joining.",
                        icon: "textures/ui/realms_green_check.png",
                    },
                    {
                        name: "Disable Mobile Block",
                        command: ["mobile", "-d"],
                        description: "Allow mobile platform players to join.",
                        icon: "textures/ui/realms_red_x.png",
                    },
                ],
            },
            {
                name: "List Current Restrictions",
                command: ["-l"],
                description: "View the current platform restrictions.",
                icon: "textures/ui/icon_sign.png",
            },
        ],
    },

    /**
     * Executes the platformBlock command to enable/disable platform-based restrictions or list current restrictions.
     * @param {ChatSendBeforeEvent} message - The chat message triggering the command.
     * @param {string[]} args - The command arguments (e.g., platform and action).
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args?: string[]): Promise<void> => {
        // handler signature allows undefined; ignore if not provided
        if (!message || !args) return;
        const player = message.sender;

        // Retrieve settings safely from the typed schema
        const moduleData = paradoxModulesDB.get("platformBlock_b") ?? {
            enabled: false,
            settings: { console: false, desktop: false, mobile: false },
        };
        const platformSettings = moduleData?.settings ?? {
            console: false,
            desktop: false,
            mobile: false,
        };

        if (args.includes("-l") || args.includes("--list")) {
            const messageLines = [
                `§2[§7Paradox§2]§o§7 Current Platform Restrictions:`,
                `  | Console: ${platformSettings.console ? "§2Blocked§7" : "§aAllowed§7"}`,
                `  | Desktop: ${platformSettings.desktop ? "§2Blocked§7" : "§aAllowed§7"}`,
                `  | Mobile: ${platformSettings.mobile ? "§2Blocked§7" : "§aAllowed§7"}`,
            ];
            player.sendMessage(messageLines.join("\n"));
            return;
        }

        const platform = args[0]?.toLowerCase();
        const action = args[1]?.toLowerCase();

        if (!["console", "desktop", "mobile"].includes(platform)) {
            player.sendMessage(`§o§c[Paradox] Invalid platform. Use console, desktop, or mobile.`);
            return;
        }

        const enableFlags = ["--enable", "-e"];
        const disableFlags = ["--disable", "-d"];
        let blockPlatform: boolean | null = null;

        if (enableFlags.includes(action)) blockPlatform = true;
        else if (disableFlags.includes(action)) blockPlatform = false;
        else {
            player.sendMessage(`§o§c[Paradox] Invalid action. Use "-e" to block or "-d" to allow.`);
            return;
        }

        const playerPlatform = player.clientSystemInfo.platformType.toLowerCase();
        if (blockPlatform && playerPlatform === platform) {
            player.sendMessage(`§o§c[Paradox] You cannot block your own platform.`);
            return;
        }

        const updatedSettings = { ...platformSettings, [platform]: blockPlatform };

        const blockedCount = Object.values(updatedSettings).filter(Boolean).length;
        if (blockedCount > 2) {
            player.sendMessage(`§o§c[Paradox] Cannot block all platforms. At least one must remain unblocked.`);
            return;
        }

        // Update the DB with typed structure
        await paradoxModulesDB.set("platformBlock_b", {
            enabled: true,
            settings: updatedSettings,
        });

        player.sendMessage(`§2[§7Paradox§2]§o§7 ${platform.charAt(0).toUpperCase() + platform.slice(1)} players are now ${blockPlatform ? "§cblocked§7 from joining" : "§aallowed§7 to join"}.`);
    },
};
