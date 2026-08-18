import { system, ChatSendBeforeEvent, Player } from "@minecraft/server";
import { Command } from "../../classes/command-handler";
import { PlayerCache } from "../../classes/cache/player-cache";
import { EventCoordinator } from "../../classes/event-coordinator";

/**
 * Server Ticks Per Second (TPS) monitor.
 *
 * This utility calculates the actual processing speed of the server.
 * Since Minecraft Bedrock aims for exactly 20 ticks per second, any value
 * below 20 indicates server-side lag, which can result in false-positive
 * anti-cheat detections.
 */
let currentTPS = 20.0;
let lastTickTimestamp = Date.now();

/** Players currently monitoring TPS in real-time */
const activeMonitors = new Set<string>();

/** Reference to the background interval */
let tpsIntervalId: number | undefined;

/** Guard to prevent multiple event/interval registrations */
let isTpsInitialized = false;

/**
 * Initializes the TPS background tasks and event listeners.
 */
function initializeTpsSystem() {
    if (isTpsInitialized) return;

    // Explicitly clean up the monitor set when a player leaves
    EventCoordinator.subscribeAfter("playerLeave", (event) => {
        activeMonitors.delete(event.playerId);
        if (activeMonitors.size === 0) stopTpsInterval();
    });
    isTpsInitialized = true;
}

/**
 * Starts the TPS calculation interval.
 */
function startTpsInterval() {
    if (tpsIntervalId !== undefined) return;
    // Reset timestamp so the first calculation isn't based on an old value
    lastTickTimestamp = Date.now();
    tpsIntervalId = system.runInterval(updateTpsHud, 20);
}

/**
 * Stops the TPS calculation interval to save resources.
 */
function stopTpsInterval() {
    if (tpsIntervalId === undefined) return;
    system.clearRun(tpsIntervalId);
    tpsIntervalId = undefined;
}

/**
 * Interval to update the TPS calculation and refresh the HUD for active monitors.
 */
function updateTpsHud() {
    const now = Date.now();
    const timeElapsed = (now - lastTickTimestamp) / 1000;

    currentTPS = Math.min(20, 20 / timeElapsed);
    lastTickTimestamp = now;

    // Generate strings ONCE per interval, not per player
    let color = "§a"; // Healthy (18-20)
    let status = "Healthy";

    if (currentTPS < 18) {
        color = "§e";
        status = "Warning";
    }
    if (currentTPS < 15) {
        color = "§6";
        status = "Struggling";
    }
    if (currentTPS < 10) {
        color = "§c";
        status = "Critical";
    }

    const title = `§2TPS: ${color}${currentTPS.toFixed(2)}`;
    const subtitle = `§7Status: ${color}${status} §8| §7Target: §f20.0`;

    for (const playerId of activeMonitors) {
        const player = PlayerCache.getPlayerById(playerId);

        // Early exit & cleanup for invalid players
        if (!player?.isValid) {
            activeMonitors.delete(playerId);
            if (activeMonitors.size === 0) stopTpsInterval();
            continue;
        }

        player.onScreenDisplay.setTitle(title, {
            subtitle: subtitle,
            fadeInDuration: 0, // Instant update for a smooth HUD feel
            stayDuration: 25, // Slightly longer than the 20-tick interval to prevent flickering
            fadeOutDuration: 5,
        });
    }
}

initializeTpsSystem();

/**
 * Command to display server performance (TPS).
 */
export const tpsCommand: Command = {
    name: "tps",
    description: "Toggles a real-time on-screen TPS monitor.",
    usage: "{prefix}tps",
    examples: ["{prefix}tps"],
    category: "Utility",
    securityClearance: 4,
    icon: "textures/items/clock_item.png",
    guiInstructions: {
        formType: "ActionFormData",
        title: "Server Performance",
        description:
            "Toggle a real-time on-screen HUD of the server Ticks Per Second (TPS).\n\n" +
            "§7Status Levels:\n" +
            "§7• §aHealthy§7: 18.0 - 20.0 TPS\n" +
            "§7• §eWarning§7: 15.0 - 18.0 TPS\n" +
            "§7• §6Struggling§7: 10.0 - 15.0 TPS\n" +
            "§7• §cCritical§7: < 10.0 TPS\n\n" +
            "§7• Display persists until toggled off or you leave the server.\n\n",
        commandOrder: "command-arg",
        actions: [
            {
                name: "Toggle TPS Monitor",
                icon: "textures/ui/clock.png",
            },
        ],
    },

    /**
     * Toggles the real-time TPS monitor for the player.
     *
     * @param {ChatSendBeforeEvent | undefined} message - The chat event that triggered the command.
     */
    execute: (message?: ChatSendBeforeEvent): void => {
        if (!message) return;
        const sender = message.sender as Player;

        if (activeMonitors.has(sender.id)) {
            activeMonitors.delete(sender.id);
            if (activeMonitors.size === 0) stopTpsInterval();
            sender.sendMessage("§2[§7Paradox§2]§o§7 TPS Monitoring is now §4Disabled");
        } else {
            activeMonitors.add(sender.id);
            startTpsInterval();
            sender.sendMessage("§2[§7Paradox§2]§o§7 TPS Monitoring is now §aEnabled");
            sender.playSound("random.orb", { volume: 0.5, pitch: 1 });
        }
    },
};
