import { ChatSendBeforeEvent, EntityHealthComponent, Player } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { MinecraftEnvironment } from "../../classes/container/dependencies";
import { initializePvPSystem, stopPvPSystem, updateCoolDownTicks } from "../../modules/pvp-manager";

/**
 * Converts a given time in seconds to a more human-readable format (hours, minutes, and seconds).
 *
 * @param {number} seconds - The time in seconds to be converted.
 * @returns {string} - A string representing the time in a human-readable format.
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
 * Command to set the custom PvP toggle cooldown time.
 * This command allows an admin to set a custom cooldown time (in seconds) for the PvP toggle action.
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
        description: "Set the cooldown time for toggling PvP in seconds. The cooldown time must be between 10 and 3600 seconds (1 hour).\n\n",
        actions: [{ name: "Continue", command: undefined, requiredFields: ["ptc"], generateModalForm: true }],
        dynamicFields: [{ name: "Set Cooldown:", type: "text", arg: undefined, placeholder: "Enter cooldown time", requiredFields: ["ptc"] }],
    },

    /**
     * Executes the pvpToggleCooldown command.
     *
     * @param {ChatSendBeforeEvent} message - The message object sent by the player.
     * @param {string[]} args - The command arguments. Expects the cooldown time as a number (in seconds).
     * @param {MinecraftEnvironment} minecraftEnvironment - The environment for Minecraft.
     */
    execute: async (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();
        const player = message.sender;

        // Ensure the argument is a valid number
        if (args.length === 0 || isNaN(Number(args[0]))) {
            player.sendMessage("§cPlease provide a valid number for the cooldown time in seconds.");
            return;
        }

        const cooldownTime = Number(args[0]);

        // Ensure the cooldown time is within a reasonable range (e.g., between 10 and 3600 seconds)
        if (cooldownTime < 10 || cooldownTime > 3600) {
            player.sendMessage("§cPlease provide a cooldown time between 10 and 3600 seconds (1 hour).");
            return;
        }

        // Convert the cooldown time to ticks (1 second = 20 ticks)
        const cooldownTimeInTicks = cooldownTime * 20;

        // Set the custom cooldown
        world.setDynamicProperty("customPvPToggleCooldown", cooldownTimeInTicks);

        // Convert the cooldown time to a human-readable format
        const readableTime = formatTime(cooldownTime);
        player.sendMessage(`§2[§7Paradox§2]§o§7 PvP toggle cooldown has been set to ${readableTime}.`);
    },
};

/**
 * Command to set the custom PvP action cooldown time.
 * This command allows an admin to set a custom cooldown time (in seconds) for the PvP action verification.
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
        description: "Set the cooldown time for PvP actions. The cooldown time must be between 10 and 3600 seconds (1 hour).\n\n",
        actions: [{ name: "Continue", command: undefined, requiredFields: ["pac"], generateModalForm: true }],
        dynamicFields: [{ name: "Set Cooldown:", type: "text", arg: undefined, placeholder: "Enter cooldown time", requiredFields: ["pac"] }],
    },

    /**
     * Executes the pvpCooldown command.
     *
     * @param {ChatSendBeforeEvent} message - The message object sent by the player.
     * @param {string[]} args - The command arguments. Expects the cooldown time as a number (in seconds).
     * @param {MinecraftEnvironment} minecraftEnvironment - The environment for Minecraft.
     */
    execute: async (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const world = minecraftEnvironment.getWorld();
        const player = message.sender;

        // Ensure the argument is a valid number
        if (args.length === 0 || isNaN(Number(args[0]))) {
            player.sendMessage("§cPlease provide a valid number for the cooldown time in seconds.");
            return;
        }

        const cooldownTime = Number(args[0]);

        // Ensure the cooldown time is within a reasonable range (e.g., between 10 and 3600 seconds)
        if (cooldownTime < 10 || cooldownTime > 3600) {
            player.sendMessage("§cPlease provide a cooldown time between 10 and 3600 seconds (1 hour).");
            return;
        }

        // Convert the cooldown time to ticks (1 second = 20 ticks)
        const cooldownTimeInTicks = cooldownTime * 20;

        // Set the custom cooldown
        world.setDynamicProperty("customPvPCooldown", cooldownTimeInTicks);

        // Convert the cooldown time to a human-readable format
        const readableTime = formatTime(cooldownTime);
        updateCoolDownTicks();
        player.sendMessage(`§2[§7Paradox§2]§o§7 PvP action cooldown has been set to ${readableTime}.`);
    },
};

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
        description: "Choose an action to modify or check your PvP settings.\n\n",
        commandOrder: "command-arg",
        actions: [
            { name: "Toggle Global PvP", command: ["global"], description: "Enable or disable PvP for the entire server.", requiredFields: [], crypto: false },
            { name: "Check PvP Status", command: ["status"], description: "View the current PvP status for yourself and the server.", requiredFields: [], crypto: false },
            { name: "Toggle Your PvP", command: undefined, description: "Enable or disable PvP for yourself only.", requiredFields: [], crypto: false },
        ],
    },

    /**
     * Executes the pvp command.
     * @param {ChatSendBeforeEvent} message - The message object.
     * @param {string[]} args - The command arguments.
     * @param {MinecraftEnvironment} minecraftEnvironment - The Minecraft environment instance.
     */
    execute: async (message: ChatSendBeforeEvent, args: string[], minecraftEnvironment: MinecraftEnvironment) => {
        const player = message.sender;
        const isGlobal = args.includes("global");
        const showStatus = args.includes("status");
        const playerClearance = player.getDynamicProperty("securityClearance") as number;
        const dynamicPropertyKey = "pvpEnabled"; // Key for PvP status dynamic property on the player
        const globalDynamicPropertyKey = "pvpGlobalEnabled"; // Key for global PvP status dynamic property
        const cooldownPropertyKey = "pvpToggleCooldown"; // Key for storing the last toggle tick
        const world = minecraftEnvironment.getWorld();
        const system = minecraftEnvironment.getSystem();
        const currentTick = system.currentTick;
        // Define default cooldown time in ticks (2 minutes = 2 * 60 * 20 ticks)
        const PVP_TOGGLE_COOLDOWN_TICKS = (world.getDynamicProperty("customPvPToggleCooldown") as number) ?? 2 * 60 * 20;

        async function setPvP(status: boolean): Promise<void> {
            return new Promise((resolve) => {
                system.run(() => {
                    world.gameRules.pvp = status;
                    resolve();
                });
            });
        }

        if (showStatus) {
            const isPvPEnabled = (player.getDynamicProperty(dynamicPropertyKey) as boolean) ?? false;
            const isPvPGlobalEnabled = (world.getDynamicProperty(globalDynamicPropertyKey) as boolean) ?? world.gameRules.pvp;

            const messageLines = [`§2[§7Paradox§2]§o§7 PvP Status Overview:`, `  | Global PvP: ${isPvPGlobalEnabled ? "§aEnabled§7" : "§4Disabled§7"}`, `  | Your PvP: ${isPvPEnabled ? "§aEnabled§7" : "§4Disabled§7"}`];

            player.sendMessage(messageLines.join("\n"));
            return;
        }

        if (isGlobal) {
            if (playerClearance < 4) {
                player.sendMessage(`§cYou do not have permission to toggle PvP globally.`);
                return;
            }

            // Get the current global PvP status
            const isPvPGlobalEnabled = (world.getDynamicProperty(globalDynamicPropertyKey) as boolean) ?? world.gameRules.pvp;

            if (isPvPGlobalEnabled) {
                world.setDynamicProperty(globalDynamicPropertyKey, false);
                player.sendMessage("§2[§7Paradox§2]§o§7 Please close your chat window to receive a message regarding your PvP settings.");

                system.run(() => {
                    // Show a confirmation form to the player if PvP is still enabled globally
                    function alertNotice(player: Player) {
                        const form = minecraftEnvironment
                            .initializeMessageFormData()
                            .title("            PvP System Disabled")
                            .body(
                                "You have disabled the global PvP management system in Paradox. This system controls how PvP is handled across the server. However, this does not automatically change the PvP game rule, which decides if PvP is allowed in the world. You can still choose to leave the PvP game rule as it is, or you can disable PvP in the world completely. Would you like to change the game rule and disable PvP in the world as well?"
                            )
                            .button1("Disable PvP Game Rule")
                            .button2("Keep PvP Enabled");

                        // Send the form to the player
                        form.show(player)
                            .then((result) => {
                                if (result && result.canceled && result.cancelationReason === "UserBusy") {
                                    return alertNotice(player);
                                }
                                if (result.selection === 0) {
                                    // Disable PvP in the world entirely
                                    world.gameRules.pvp = false;
                                    world.setDynamicProperty(globalDynamicPropertyKey, false);
                                    player.sendMessage("§2[§7Paradox§2]§o§7 PvP has been §4disabled§7 in the world and the game rule has been updated.");
                                    stopPvPSystem();
                                } else {
                                    // Keep PvP enabled in the world
                                    world.setDynamicProperty(globalDynamicPropertyKey, false);
                                    player.sendMessage("§2[§7Paradox§2]§o§7 PvP remains §aenabled§7 in the world, but the PvP management system is now disabled.");
                                    stopPvPSystem();
                                }
                            })
                            .catch((error: Error) => {
                                console.error("Paradox Unhandled Rejection: ", error);
                                if (error instanceof Error) {
                                    // Check if error.stack exists before trying to split it
                                    if (error.stack) {
                                        const stackLines: string[] = error.stack.split("\n");
                                        if (stackLines.length > 1) {
                                            const sourceInfo: string[] = stackLines;
                                            console.error("Error originated from:", sourceInfo[0]);
                                        }
                                    }
                                }
                            });
                    }
                    alertNotice(player);
                });
            } else {
                // Enable global PvP
                await setPvP(true);
                const players = world.getAllPlayers();
                for (const player of players) {
                    const healthComponent = player.getComponent("health") as EntityHealthComponent;
                    if (healthComponent) {
                        player.setDynamicProperty("paradoxCurrentHealth", healthComponent.currentValue);
                    }
                }
                world.setDynamicProperty(globalDynamicPropertyKey, true);
                initializePvPSystem();
                player.sendMessage(`§2[§7Paradox§2]§o§7 Global PvP has been §aenabled§7.`);
            }
        } else {
            // Get the current PvP status of the player from dynamic properties
            const isPvPEnabled = (player.getDynamicProperty(dynamicPropertyKey) as boolean) ?? false;
            const lastToggleTick = (player.getDynamicProperty(cooldownPropertyKey) as number) ?? 0;

            // Check if the cooldown period has passed
            if (currentTick - lastToggleTick < PVP_TOGGLE_COOLDOWN_TICKS) {
                const ticksRemaining = PVP_TOGGLE_COOLDOWN_TICKS - (currentTick - lastToggleTick);
                const secondsRemaining = Math.ceil(ticksRemaining / 20); // Convert ticks to seconds

                let timeRemainingMessage;
                if (secondsRemaining > 60) {
                    const minutesRemaining = Math.floor(secondsRemaining / 60);
                    const remainingSeconds = secondsRemaining % 60;
                    timeRemainingMessage = `${minutesRemaining} minutes${remainingSeconds > 0 ? ` and ${remainingSeconds} seconds` : ""}`;
                } else {
                    timeRemainingMessage = `${secondsRemaining} seconds`;
                }

                player.sendMessage(`§2[§7Paradox§2]§o§7 You can toggle PvP again in ${timeRemainingMessage}.`);
                return;
            }

            // Toggle the PvP status for the player
            if (isPvPEnabled) {
                // Disable PvP
                player.setDynamicProperty(dynamicPropertyKey, false);
                player.sendMessage(`§2[§7Paradox§2]§o§7 PvP has been §4disabled§7 for you.`);
            } else {
                // Enable PvP
                player.setDynamicProperty(dynamicPropertyKey, true);
                player.sendMessage(`§2[§7Paradox§2]§o§7 PvP has been §aenabled§7 for you.`);
            }

            // Update the cooldown tick count
            player.setDynamicProperty(cooldownPropertyKey, currentTick);
        }
    },
};
