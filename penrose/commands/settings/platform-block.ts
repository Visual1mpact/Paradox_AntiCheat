import { ChatSendBeforeEvent } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { paradoxModulesDB } from "../../paradox";

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

    /**
     * Executes the platformBlock command to enable/disable platform-based restrictions or list current restrictions.
     * @param {ChatSendBeforeEvent} message - The chat message triggering the command.
     * @param {string[]} args - The command arguments (e.g., platform and action).
     */
    execute: (message: ChatSendBeforeEvent, args: string[]) => {
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
            player.sendMessage(`§cInvalid platform. Use console, desktop, or mobile.`);
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
            player.sendMessage(`§cInvalid action. Use "-e" to block or "-d" to allow.`);
            return;
        }

        // Restrict the player from blocking their own platform
        const playerPlatform = player.clientSystemInfo.platformType.toLowerCase();
        if (blockPlatform && playerPlatform === platform) {
            player.sendMessage(`§cYou cannot block your own platform.`);
            return;
        }

        // Temporarily update the platform setting for validation
        platformSettings[platform] = blockPlatform;

        // Check if blocking this platform will block all platforms
        const blockedPlatforms = ["console", "desktop", "mobile"].filter((platformType) => platformSettings[platformType as keyof PlatformBlockSettings] === true);

        if (blockedPlatforms.length > 2) {
            // Revert the change to ensure at least one platform is unblocked
            platformSettings[platform] = !blockPlatform;
            player.sendMessage(`§cCannot block all platforms. At least one platform must remain unblocked.`);
            return;
        }

        // Commit the validated platform block settings
        paradoxModulesDB.set(platformBlockSettingsKey, platformSettings);

        // Notify the player of the change
        const status = blockPlatform ? "blocked" : "allowed";
        player.sendMessage(`§2[§7Paradox§2]§o§7 ${platform.charAt(0).toUpperCase() + platform.slice(1)} players are now ${status} from joining.`);
    },
};
