import { ChatSendBeforeEvent, Player, system, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { initializePvPSystem, stopPvPSystem, updateCoolDownTicks } from "../../modules/pvp-manager-module";
import { MessageFormData } from "@minecraft/server-ui";

const DYNAMIC_PROP_PVP_ENABLED = "pvpEnabled";
const DYNAMIC_PROP_GLOBAL_PVP = "pvpGlobalEnabled";
const DYNAMIC_PROP_COOLDOWN = "pvpToggleCooldown";
const DEFAULT_COOLDOWN_TICKS = 2 * 60 * 20;

/**
 * Converts a given duration in seconds to a formatted, human-readable string.
 *
 * @param {number} seconds - Total duration in seconds.
 * @returns {string} Formatted duration string (e.g., "1 hour 5 minutes 10 seconds").
 */
function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const parts: string[] = [];

    if (hours > 0) {
        parts.push(`${hours} hour${hours > 1 ? "s" : ""}`);
    }
    if (minutes > 0) {
        parts.push(`${minutes} minute${minutes > 1 ? "s" : ""}`);
    }
    if (remainingSeconds > 0 || parts.length === 0) {
        parts.push(`${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`);
    }

    return parts.join(" ");
}

/**
 * Validates and extracts a numeric cooldown value in seconds from command arguments.
 *
 * @param {Player} player - Executing target player.
 * @param {string[]} [args] - Command arguments array.
 * @returns {number | undefined} Cooldown value in seconds if valid, otherwise undefined.
 */
function parseCooldownArgument(player: Player, args?: string[]): number | undefined {
    if (!args || args.length === 0) {
        player.sendMessage("§o§c[Paradox] Please provide a valid number for the cooldown time in seconds.");
        return undefined;
    }

    const cooldownTime = Number(args[0]);
    if (Number.isNaN(cooldownTime) || cooldownTime < 10 || cooldownTime > 3600) {
        player.sendMessage("§o§c[Paradox] Please provide a cooldown time between 10 and 3600 seconds (1 hour).");
        return undefined;
    }

    return cooldownTime;
}

/**
 * Configures the required wait time before a player can toggle their personal PvP state again.
 */
export const pvpSetToggleCDCommand: Command = {
    name: "pvpSetToggleCD",
    description: "Configures the toggle cooldown window (CD) required before a player can change their PvP state again.",
    usage: "{prefix}pvpSetToggleCD <time in seconds>",
    examples: [`{prefix}pvpSetToggleCD 180`],
    category: "Utility",
    securityClearance: 4,
    icon: "textures/ui/timer.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "PvP Toggle Cooldown (CD) Window",
        description:
            "Sets the server-wide toggle cooldown window (CD) in seconds enforced whenever a player switches their personal PvP status.\n\n" +
            "§7• Cooldown Window (CD): Establishes a mandatory lockout timer immediately after changing PvP status.\n" +
            "§7• Purpose: Prevents players from rapidly toggling PvP on and off to bypass combat hazards or exploit safe areas.\n" +
            "§7• Behavior: The player must wait out this full cooldown window (CD) before toggling their status again.\n" +
            "§7• Minimum Window: 10 seconds\n" +
            "§7• Maximum Window: 3600 seconds (1 hour)\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Save Configuration",
                icon: "textures/ui/check.png",
                description: "Save and apply the new PvP toggle cooldown (CD) window.",
                requiredFields: ["ptc"],
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            {
                name: "\nSet Toggle Cooldown Window (Seconds):",
                type: "text",
                placeholder: "Enter duration (10 - 3600)",
                requiredFields: ["ptc"],
            },
        ],
    },

    /**
     * Executes the pvpSetToggleCD command.
     *
     * @param {ChatSendBeforeEvent | undefined} message - Chat event context.
     * @param {string[]} [args] - Command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent | undefined, args?: string[]): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const cooldownTime = parseCooldownArgument(player, args);
        if (cooldownTime === undefined) return;

        world.setDynamicProperty("customPvPToggleCooldown", cooldownTime * 20);
        player.sendMessage(`§2[§7Paradox§2]§o§7 PvP toggle cooldown window (CD) set to ${formatTime(cooldownTime)}.`);
    },
};

/**
 * Configures the active combat tag duration during player-versus-player engagements.
 */
export const pvpSetCombatCDCommand: Command = {
    name: "pvpSetCombatCD",
    description: "Configures the active combat cooldown window (CD) applied to players engaged in PvP.",
    usage: "{prefix}pvpSetCombatCD <time in seconds>",
    examples: [`{prefix}pvpSetCombatCD 180`],
    category: "Utility",
    securityClearance: 4,
    icon: "textures/ui/icon_timer.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "PvP Combat Cooldown (CD) Window",
        description:
            "Sets the active combat cooldown window (CD) in seconds applied to players involved in player-versus-player combat.\n\n" +
            "§7• Cooldown Window (CD): Enforces a continuous combat tag duration whenever a player attacks or receives damage.\n" +
            "§7• Purpose: Holds players in combat state to prevent safe-zone escaping, combat logging, or teleports.\n" +
            "§7• Behavior: Resets on every incoming or outgoing hit. Players exit combat only after the cooldown window (CD) expires untouched.\n" +
            "§7• Minimum Window: 10 seconds\n" +
            "§7• Maximum Window: 3600 seconds (1 hour)\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Save Configuration",
                icon: "textures/ui/check.png",
                description: "Save and apply the new PvP combat cooldown (CD) window.",
                requiredFields: ["pac"],
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            {
                name: "\nSet Combat Cooldown Window (Seconds):",
                type: "text",
                placeholder: "Enter duration (10 - 3600)",
                requiredFields: ["pac"],
            },
        ],
    },

    /**
     * Executes the pvpSetCombatCD command.
     *
     * @param {ChatSendBeforeEvent | undefined} message - Chat event context.
     * @param {string[]} [args] - Command arguments.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent | undefined, args?: string[]): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const cooldownTime = parseCooldownArgument(player, args);
        if (cooldownTime === undefined) return;

        world.setDynamicProperty("customPvPCooldown", cooldownTime * 20);
        updateCoolDownTicks();
        player.sendMessage(`§2[§7Paradox§2]§o§7 PvP combat cooldown window (CD) set to ${formatTime(cooldownTime)}.`);
    },
};

/**
 * Displays current player and global PvP configuration to the user.
 *
 * @param {Player} player - Target receiver player.
 */
function handleShowStatus(player: Player): void {
    const isPvPEnabled = (player.getDynamicProperty(DYNAMIC_PROP_PVP_ENABLED) as boolean) ?? false;
    const isPvPGlobalEnabled = (world.getDynamicProperty(DYNAMIC_PROP_GLOBAL_PVP) as boolean) ?? world.gameRules.pvp;

    const statusReport = `§2[§7Paradox§2]§o§7 PvP Status Overview:\n` + `  | Global PvP: ${isPvPGlobalEnabled ? "§aEnabled§7" : "§4Disabled§7"}\n` + `  | Your PvP: ${isPvPEnabled ? "§aEnabled§7" : "§4Disabled§7"}`;

    player.sendMessage(statusReport);
}

/**
 * Handles modal dialog confirmation and world options when disabling global PvP.
 *
 * @param {Player} player - Target administrator player.
 */
function promptDisableGlobalPvP(player: Player): void {
    world.setDynamicProperty(DYNAMIC_PROP_GLOBAL_PVP, false);
    player.sendMessage("§2[§7Paradox§2]§o§7 Please close your chat window to receive a message regarding your PvP settings.");

    const form = new MessageFormData()
        .title("            PvP System Disabled")
        .body(
            "You have disabled the global PvP management system in Paradox. This system controls how PvP is handled across the server. However, this does not automatically change the PvP game rule, which decides if PvP is allowed in the world. You can still choose to leave the PvP game rule as it is, or you can disable PvP in the world completely. Would you like to change the game rule and disable PvP in the world as well?"
        )
        .button1("Disable PvP Game Rule")
        .button2("Keep PvP Enabled");

    form.show(player)
        .then((result) => {
            if (result?.canceled && result.cancelationReason === "UserBusy") {
                promptDisableGlobalPvP(player);
                return;
            }
            if (result?.selection === 0) {
                world.gameRules.pvp = false;
                player.sendMessage("§2[§7Paradox§2]§o§7 PvP has been §4disabled§7 in the world and the game rule has been updated.");
            } else {
                player.sendMessage("§2[§7Paradox§2]§o§7 PvP remains §aenabled§7 in the world, but the PvP management system is now disabled.");
            }
            stopPvPSystem();
        })
        .catch((error: unknown) => {
            console.error("[Paradox] Unhandled Rejection: ", error);
        });
}

/**
 * Enables server-wide global PvP systems and sets relevant world rules.
 *
 * @param {Player} player - Target administrator player.
 */
function enableGlobalPvP(player: Player): void {
    world.gameRules.pvp = true;
    world.setDynamicProperty(DYNAMIC_PROP_GLOBAL_PVP, true);
    initializePvPSystem();
    player.sendMessage(`§2[§7Paradox§2]§o§7 Global PvP has been §aenabled§7.`);
}

/**
 * Evaluates authority and toggles global server-wide PvP states.
 *
 * @param {Player} player - Target administrator player.
 */
function handleGlobalToggle(player: Player): void {
    const playerClearance = player.getDynamicProperty("securityClearance") as number;
    if (playerClearance < 4) {
        player.sendMessage(`§o§c[Paradox] You do not have permission to toggle PvP globally.`);
        return;
    }

    const isPvPGlobalEnabled = (world.getDynamicProperty(DYNAMIC_PROP_GLOBAL_PVP) as boolean) ?? world.gameRules.pvp;
    if (isPvPGlobalEnabled) {
        promptDisableGlobalPvP(player);
    } else {
        enableGlobalPvP(player);
    }
}

/**
 * Checks if a player is currently restricted by the personal PvP toggle cooldown window.
 *
 * @param {Player} player - Player to check.
 * @param {number} currentTick - Current world tick.
 * @returns {boolean} True if the toggle cooldown window is still active.
 */
function isToggleCooldownActive(player: Player, currentTick: number): boolean {
    const lastToggleTick = (player.getDynamicProperty(DYNAMIC_PROP_COOLDOWN) as number) ?? 0;
    const cooldownTicks = (world.getDynamicProperty("customPvPToggleCooldown") as number) ?? DEFAULT_COOLDOWN_TICKS;
    const elapsedTicks = currentTick - lastToggleTick;

    if (elapsedTicks >= cooldownTicks) {
        return false;
    }

    const secondsRemaining = Math.ceil((cooldownTicks - elapsedTicks) / 20);
    player.sendMessage(`§2[§7Paradox§2]§o§7 You can toggle PvP again in ${formatTime(secondsRemaining)}.`);
    return true;
}

/**
 * Handles toggling personal PvP status for an individual player.
 *
 * @param {Player} player - Executing target player.
 * @param {number} currentTick - Current world system tick index.
 */
function handlePersonalToggle(player: Player, currentTick: number): void {
    if (isToggleCooldownActive(player, currentTick)) return;

    const isPvPEnabled = (player.getDynamicProperty(DYNAMIC_PROP_PVP_ENABLED) as boolean) ?? false;
    player.setDynamicProperty(DYNAMIC_PROP_PVP_ENABLED, !isPvPEnabled);
    player.setDynamicProperty(DYNAMIC_PROP_COOLDOWN, currentTick);

    const statusText = !isPvPEnabled ? "§aenabled§7" : "§4disabled§7";
    player.sendMessage(`§2[§7Paradox§2]§o§7 PvP has been ${statusText} for you.`);
}

/**
 * Handles player requests to view or change personal or server-wide PvP states.
 */
export const pvpToggleCommand: Command = {
    name: "pvp",
    description: "Toggle PvP mode for yourself, globally, or check current status.",
    specialNote: "* To bypass PvP in safe zones, give the player the tag: paradoxBypassPvPCheck",
    usage: "{prefix}pvp [global | status | help]",
    examples: [`{prefix}pvp`, `{prefix}pvp global`, `{prefix}pvp status`, `{prefix}pvp help`],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/items/netherite_sword.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "PvP Settings",
        description:
            "Choose an action to manage your PvP settings or check the server status.\n\n" +
            "§7• Toggle your personal PvP status.\n" +
            "§7• Toggle global server PvP (requires admin clearance).\n" +
            "§7• Check current global and personal PvP settings.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Toggle Global PvP",
                icon: "textures/ui/icon_multiplayer.png",
                securityClearance: 4,
                command: ["global"],
                description: "Enable or disable PvP for the entire server.",
            },
            {
                name: "Check PvP Status",
                icon: "textures/ui/realms_slot_check.png",
                securityClearance: 1,
                command: ["status"],
                description: "View current PvP status for yourself and the server.",
            },
            {
                name: "Toggle Your PvP",
                icon: "textures/ui/icon_steve.png",
                securityClearance: 1,
                description: "Enable or disable PvP for yourself only.",
            },
        ],
    },

    /**
     * Executes the pvp command.
     *
     * @param {ChatSendBeforeEvent | undefined} message - Chat event context.
     * @param {string[]} [args] - Command arguments list.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent | undefined, args?: string[]): Promise<void> => {
        if (!message || !args) return;

        const player = message.sender;

        if (args.includes("status")) {
            handleShowStatus(player);
            return;
        }

        if (args.includes("global")) {
            handleGlobalToggle(player);
            return;
        }

        handlePersonalToggle(player, system.currentTick);
    },
};
