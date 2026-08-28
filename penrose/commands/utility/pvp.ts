import { ChatSendBeforeEvent, EntityHealthComponent, Player, system, world } from "@minecraft/server";
import { Command } from "../../classes/core/command-handler";
import { initializePvPSystem, stopPvPSystem, updateCoolDownTicks } from "../../modules/pvp-manager-module";
import { MessageFormData } from "@minecraft/server-ui";
import { PlayerCache } from "../../classes/cache/player-cache";

const DYNAMIC_PROP_PVP_ENABLED = "pvpEnabled";
const DYNAMIC_PROP_GLOBAL_PVP = "pvpGlobalEnabled";
const DYNAMIC_PROP_COOLDOWN = "pvpToggleCooldown";
const DEFAULT_COOLDOWN_TICKS = 2 * 60 * 20;

/**
 * Converts a given time in seconds to a human-readable string format.
 *
 * @param {number} seconds - The duration in seconds.
 * @returns {string} Human-readable time formatted string.
 */
function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    let formattedTime = "";

    if (hours > 0) {
        formattedTime += `${hours} hour${hours > 1 ? "s" : ""}`;
    }

    if (minutes > 0) {
        if (formattedTime) formattedTime += " ";
        formattedTime += `${minutes} minute${minutes > 1 ? "s" : ""}`;
    }

    if (remainingSeconds > 0 || (hours === 0 && minutes === 0)) {
        if (formattedTime) formattedTime += " ";
        formattedTime += `${remainingSeconds} second${remainingSeconds > 1 ? "s" : ""}`;
    }

    return formattedTime;
}

/**
 * Parses and validates raw input numerical arguments for cooldown commands.
 *
 * @param {Player} player - The command sender.
 * @param {string[] | undefined} args - Command raw argument strings.
 * @returns {number | undefined} Evaluated cooldown seconds or undefined if invalid.
 */
function parseCooldownArgument(player: Player, args?: string[]): number | undefined {
    if (!args || args.length === 0 || isNaN(Number(args[0]))) {
        player.sendMessage("§o§c[Paradox] Please provide a valid number for the cooldown time in seconds.");
        return undefined;
    }

    const cooldownTime = Number(args[0]);
    if (cooldownTime < 10 || cooldownTime > 3600) {
        player.sendMessage("§o§c[Paradox] Please provide a cooldown time between 10 and 3600 seconds (1 hour).");
        return undefined;
    }

    return cooldownTime;
}

/**
 * Command to set the custom PvP toggle cooldown time.
 */
export const pvpToggleCooldownCommand: Command = {
    name: "pvpToggleCooldown",
    description: "Set a custom PvP toggle cooldown in seconds.",
    usage: "{prefix}pvpToggleCooldown <time in seconds>",
    examples: [`{prefix}pvpToggleCooldown 180`],
    category: "Utility",
    securityClearance: 4,
    icon: "textures/ui/timer.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "PvP Toggle Cooldown",
        description: "Set a custom cooldown time (in seconds) for toggling PvP.\n\n" + "§7• Minimum: 10 seconds\n" + "§7• Maximum: 3600 seconds (1 hour)\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Continue",
                icon: "textures/ui/check.png",
                description: "Proceed to set the PvP toggle cooldown.",
                requiredFields: ["ptc"],
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            {
                name: "\nSet Cooldown:",
                type: "text",
                placeholder: "Enter cooldown time",
                requiredFields: ["ptc"],
            },
        ],
    },

    /**
     * Executes the pvpToggleCooldown command.
     *
     * @param {ChatSendBeforeEvent} message - The message event context.
     * @param {string[]} [args] - Command argument list.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent | undefined, args?: string[]): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const cooldownTime = parseCooldownArgument(player, args);
        if (cooldownTime === undefined) return;

        world.setDynamicProperty("customPvPToggleCooldown", cooldownTime * 20);
        player.sendMessage(`§2[§7Paradox§2]§o§7 PvP toggle cooldown has been set to ${formatTime(cooldownTime)}.`);
    },
};

/**
 * Command to set the custom PvP action cooldown time.
 */
export const pvpCooldownCommand: Command = {
    name: "pvpCooldown",
    description: "Set a custom PvP action cooldown in seconds.",
    usage: "{prefix}pvpCooldown <time in seconds>",
    examples: [`{prefix}pvpCooldown 180`],
    category: "Utility",
    securityClearance: 4,
    icon: "textures/ui/icon_timer.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "PvP Action Cooldown",
        description: "Set a custom cooldown time (in seconds) for PvP actions.\n\n" + "§7• Minimum: 10 seconds\n" + "§7• Maximum: 3600 seconds (1 hour)\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Continue",
                icon: "textures/ui/check.png",
                description: "Proceed to set the PvP action cooldown.",
                requiredFields: ["pac"],
                generateModalForm: true,
            },
        ],
        dynamicFields: [
            {
                name: "\nSet Cooldown:",
                type: "text",
                placeholder: "Enter cooldown time",
                requiredFields: ["pac"],
            },
        ],
    },

    /**
     * Executes the pvpCooldown command.
     *
     * @param {ChatSendBeforeEvent} message - The message event context.
     * @param {string[]} [args] - Command argument list.
     * @returns {Promise<void>}
     */
    execute: async (message: ChatSendBeforeEvent | undefined, args?: string[]): Promise<void> => {
        if (!message) return;
        const player = message.sender;

        const cooldownTime = parseCooldownArgument(player, args);
        if (cooldownTime === undefined) return;

        world.setDynamicProperty("customPvPCooldown", cooldownTime * 20);
        updateCoolDownTicks();
        player.sendMessage(`§2[§7Paradox§2]§o§7 PvP action cooldown has been set to ${formatTime(cooldownTime)}.`);
    },
};

/**
 * Displays current player and global PvP configuration to the user.
 *
 * @param {Player} player - Executing target player.
 */
function handleShowStatus(player: Player): void {
    const isPvPEnabled = (player.getDynamicProperty(DYNAMIC_PROP_PVP_ENABLED) as boolean) ?? false;
    const isPvPGlobalEnabled = (world.getDynamicProperty(DYNAMIC_PROP_GLOBAL_PVP) as boolean) ?? world.gameRules.pvp;

    const messageLines = [`§2[§7Paradox§2]§o§7 PvP Status Overview:`, `  | Global PvP: ${isPvPGlobalEnabled ? "§aEnabled§7" : "§4Disabled§7"}`, `  | Your PvP: ${isPvPEnabled ? "§aEnabled§7" : "§4Disabled§7"}`];

    player.sendMessage(messageLines.join("\n"));
}

/**
 * Handles confirmation UI and system teardown when disabling global PvP.
 *
 * @param {Player} player - Target admin player.
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
            if (result && result.canceled && result.cancelationReason === "UserBusy") {
                return promptDisableGlobalPvP(player);
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
 * Handles server-wide global PvP activation routines.
 *
 * @param {Player} player - Executing admin player.
 */
function enableGlobalPvP(player: Player): void {
    world.gameRules.pvp = true;
    for (const p of PlayerCache.getPlayers()) {
        const healthComponent = p.getComponent("health") as EntityHealthComponent;
        if (healthComponent) {
            p.setDynamicProperty("paradoxCurrentHealth", healthComponent.currentValue);
        }
    }
    world.setDynamicProperty(DYNAMIC_PROP_GLOBAL_PVP, true);
    initializePvPSystem();
    player.sendMessage(`§2[§7Paradox§2]§o§7 Global PvP has been §aenabled§7.`);
}

/**
 * Handles processing for global PvP management operations.
 *
 * @param {Player} player - Executing target player.
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
 * Evaluates whether personal player PvP toggle active cooldowns have elapsed.
 *
 * @param {Player} player - Executing target player.
 * @param {number} currentTick - Current world system tick index.
 * @returns {boolean} True if toggle cooldown is still active.
 */
function isToggleCooldownActive(player: Player, currentTick: number): boolean {
    const lastToggleTick = (player.getDynamicProperty(DYNAMIC_PROP_COOLDOWN) as number) ?? 0;
    const cooldownTicks = (world.getDynamicProperty("customPvPToggleCooldown") as number) ?? DEFAULT_COOLDOWN_TICKS;

    if (currentTick - lastToggleTick >= cooldownTicks) {
        return false;
    }

    const ticksRemaining = cooldownTicks - (currentTick - lastToggleTick);
    const secondsRemaining = Math.ceil(ticksRemaining / 20);

    let timeMsg = `${secondsRemaining} seconds`;
    if (secondsRemaining > 60) {
        const minutes = Math.floor(secondsRemaining / 60);
        const secs = secondsRemaining % 60;
        timeMsg = `${minutes} minutes${secs > 0 ? ` and ${secs} seconds` : ""}`;
    }

    player.sendMessage(`§2[§7Paradox§2]§o§7 You can toggle PvP again in ${timeMsg}.`);
    return true;
}

/**
 * Handles toggling personal PvP status state for individual players.
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
 * Represents the PvP toggle command.
 */
export const pvpToggleCommand: Command = {
    name: "pvp",
    description: "Toggle PvP mode for yourself, globally, or check the current PvP status.",
    specialNote: "* To bypass PvP in safe zones, give the player the tag: paradoxBypassPvPCheck",
    usage: "{prefix}pvp [global | status | help]",
    examples: [`{prefix}pvp`, `{prefix}pvp global`, `{prefix}pvp status`, `{prefix}pvp help`],
    category: "Utility",
    securityClearance: 1,
    icon: "textures/items/netherite_sword.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "PvP Settings",
        description: "Choose an action to manage your PvP settings or check the server status.\n\n" + "§7• Toggle your own PvP status.\n" + "§7• Toggle global PvP (requires admin clearance).\n" + "§7• Check current PvP status.\n\n",
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
                description: "View the current PvP status for yourself and the server.",
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
     * @param {ChatSendBeforeEvent} message - The message event context.
     * @param {string[]} [args] - Command argument list.
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
