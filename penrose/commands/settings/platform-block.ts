import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

// Define a type for platform block settings to ensure type safety
interface PlatformBlockSettings {
    console: boolean;
    desktop: boolean;
    mobile: boolean;
}

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
        actions: [
            {
                name: "Console Platform",
                command: undefined,
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
                command: undefined,
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
                command: undefined,
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
    execute: async (message: ChatSendBeforeEvent, args: string[]): Promise<void> => {
        const player = message.sender;

        const platformBlockSettingsKey = "platformBlock_settings";

        // Get current settings from paradoxModulesDB
        let platformSettings: PlatformBlockSettings = paradoxModulesDB.get(platformBlockSettingsKey) ?? {
            console: false,
            desktop: false,
            mobile: false,
        };

        // Handle listing of current platform restrictions
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

        // Parse platform and action arguments
        const platform = args[0]?.toLowerCase() as "console" | "desktop" | "mobile";
        const action = args[1]?.toLowerCase();

        // Validate platform argument
        if (!["console", "desktop", "mobile"].includes(platform)) {
            player.sendMessage(`§o§c[Paradox] Invalid platform. Use console, desktop, or mobile.`);
            return;
        }

        // Map flags and arguments for enable/disable actions
        const enableFlags = ["--enable", "-e"];
        const disableFlags = ["--disable", "-d"];
        let blockPlatform: boolean | null = null;

        if (enableFlags.includes(action)) {
            blockPlatform = true;
        } else if (disableFlags.includes(action)) {
            blockPlatform = false;
        } else {
            player.sendMessage(`§o§c[Paradox] Invalid action. Use "-e" to block or "-d" to allow.`);
            return;
        }

        // Restrict the player from blocking their own platform
        const playerPlatform = player.clientSystemInfo.platformType.toLowerCase();
        if (blockPlatform && playerPlatform === platform) {
            player.sendMessage(`§o§c[Paradox] You cannot block your own platform.`);
            return;
        }

        // Temporarily update the platform setting for validation
        platformSettings[platform] = blockPlatform;

        // Check if blocking this platform will block all platforms
        const blockedPlatforms = ["console", "desktop", "mobile"].filter((platformType) => platformSettings[platformType as keyof PlatformBlockSettings] === true);

        if (blockedPlatforms.length > 2) {
            // Revert the change to ensure at least one platform is unblocked
            platformSettings[platform] = !blockPlatform;
            player.sendMessage(`§o§c[Paradox] Cannot block all platforms. At least one platform must remain unblocked.`);
            return;
        }

        // Commit the validated platform block settings
        await paradoxModulesDB.set(platformBlockSettingsKey, platformSettings);

        // Notify the player of the change
        const status = blockPlatform ? "blocked" : "allowed";
        player.sendMessage(`§2[§7Paradox§2]§o§7 ${platform.charAt(0).toUpperCase() + platform.slice(1)} players are now ${status} from joining.`);
    },
};
