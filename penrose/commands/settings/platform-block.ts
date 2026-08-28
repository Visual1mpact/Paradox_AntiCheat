import { ChatSendBeforeEvent, Player } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { paradoxModulesDB } from "../../event-listeners/world-initialize";

interface PlatformSettings {
    console: boolean;
    desktop: boolean;
    mobile: boolean;
}

interface ModuleData {
    enabled: boolean;
    settings: PlatformSettings;
}

const DEFAULT_SETTINGS: PlatformSettings = { console: false, desktop: false, mobile: false };

/**
 * Displays the current status of platform restrictions to the player.
 * @param {Player} player - The player executing the list query.
 * @param {PlatformSettings} platformSettings - Current platform restriction flags.
 */
function handleListAction(player: Player, platformSettings: PlatformSettings): void {
    const formatStatus = (blocked: boolean) => (blocked ? "§4Blocked§7" : "§aAllowed§7");
    const messageLines = [
        `§2[§7Paradox§2]§o§7 Current Platform Restrictions:`,
        `  | Console: ${formatStatus(platformSettings.console)}`,
        `  | Desktop: ${formatStatus(platformSettings.desktop)}`,
        `  | Mobile: ${formatStatus(platformSettings.mobile)}`,
    ];
    player.sendMessage(messageLines.join("\n"));
}

/**
 * Validates target platform, action flag, self-blocking rules, and total block limits.
 * @param {Player} player - The player invoking the command.
 * @param {string | undefined} platform - Target platform.
 * @param {string | undefined} action - Action flag provided.
 * @param {PlatformSettings} currentSettings - Current settings state.
 * @returns {boolean | null} The intended block state boolean, or null if validation fails.
 */
function validateAndDetermineBlockState(player: Player, platform: string | undefined, action: string | undefined, currentSettings: PlatformSettings): boolean | null {
    const validPlatforms = ["console", "desktop", "mobile"];
    if (!platform || !validPlatforms.includes(platform)) {
        player.sendMessage(`§o§c[Paradox] Invalid platform. Use console, desktop, or mobile.`);
        return null;
    }

    const isEnable = ["--enable", "-e"].includes(action ?? "");
    const isDisable = ["--disable", "-d"].includes(action ?? "");

    if (!isEnable && !isDisable) {
        player.sendMessage(`§o§c[Paradox] Invalid action. Use "-e" to block or "-d" to allow.`);
        return null;
    }

    const blockPlatform = isEnable;
    const playerPlatform = player.clientSystemInfo.platformType.toLowerCase();

    if (blockPlatform && playerPlatform === platform) {
        player.sendMessage(`§o§c[Paradox] You cannot block your own platform.`);
        return null;
    }

    const updatedSettings = { ...currentSettings, [platform]: blockPlatform };
    const blockedCount = Object.values(updatedSettings).filter(Boolean).length;

    if (blockedCount > 2) {
        player.sendMessage(`§o§c[Paradox] Cannot block all platforms. At least one must remain unblocked.`);
        return null;
    }

    return blockPlatform;
}

/**
 * Updates storage and informs player of execution outcome.
 * @param {Player} player - Target recipient for notification.
 * @param {string} platform - Modified platform.
 * @param {boolean} blockPlatform - Applied restriction state.
 * @param {PlatformSettings} platformSettings - Current platform configuration.
 */
async function updatePlatformState(player: Player, platform: string, blockPlatform: boolean, platformSettings: PlatformSettings): Promise<void> {
    const updatedSettings = { ...platformSettings, [platform]: blockPlatform };

    await paradoxModulesDB.set("platformBlock_b", {
        enabled: true,
        settings: updatedSettings,
    });

    const actionText = blockPlatform ? "§cblocked§7 from joining" : "§aallowed§7 to join";
    const formattedPlatform = platform.charAt(0).toUpperCase() + platform.slice(1);
    player.sendMessage(`§2[§7Paradox§2]§o§7 ${formattedPlatform} players are now ${actionText}.`);
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
        description:
            "Control which platforms are allowed to join the server and view current restrictions.\n\n" +
            "§7• §fConsole Platform§7: Block or allow players connecting via consoles (Xbox, PlayStation, etc.).\n" +
            "§7• §fDesktop Platform§7: Block or allow players connecting via desktop clients.\n" +
            "§7• §fMobile Platform§7: Block or allow players connecting via mobile devices.\n" +
            "§7• §fList Current Restrictions§7: View the current blocked/allowed status for all platforms.\n\n" +
            "§7Platform Rules:\n" +
            "§7• You cannot block your own platform while issuing the command.\n" +
            "§7• At least one platform must remain unblocked at all times.\n" +
            "§7• Only administrators with clearance level 4 can modify platform restrictions.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Console Platform",
                description: "Manage console platform players.\n\n",
                generateSubActions: true,
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
                generateSubActions: true,
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
                generateSubActions: true,
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
     * @param {ChatSendBeforeEvent} [message] - The chat message triggering the command.
     * @param {string[]} [args] - The command arguments (e.g., platform and action).
     * @returns {Promise<void>}
     */
    execute: async (message?: ChatSendBeforeEvent, args?: string[]): Promise<void> => {
        if (!message || !args) return;

        const player = message.sender;
        const moduleData = (await paradoxModulesDB.get("platformBlock_b")) as ModuleData | undefined;
        const platformSettings = moduleData?.settings ?? DEFAULT_SETTINGS;

        if (args.includes("-l") || args.includes("--list")) {
            handleListAction(player, platformSettings);
            return;
        }

        const platform = args[0]?.toLowerCase();
        const action = args[1]?.toLowerCase();

        const blockPlatform = validateAndDetermineBlockState(player, platform, action, platformSettings);
        if (blockPlatform === null || !platform) return;

        await updatePlatformState(player, platform, blockPlatform, platformSettings);
    },
};
