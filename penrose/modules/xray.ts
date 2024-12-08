import { PlayerBreakBlockAfterEvent, PlayerLeaveAfterEvent, world, system } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

// Configuration Constants for Xray detection
const XRAY_BLOCKS = new Set([
    "minecraft:ancient_debris",
    "minecraft:diamond_ore",
    "minecraft:deepslate_diamond_ore",
    "minecraft:emerald_ore",
    "minecraft:deepslate_emerald_ore",
    "minecraft:redstone_ore",
    "minecraft:deepslate_redstone_ore",
    "minecraft:lapis_ore",
    "minecraft:deepslate_lapis_ore",
    "minecraft:gold_ore",
    "minecraft:deepslate_gold_ore",
    "minecraft:iron_ore",
    "minecraft:deepslate_iron_ore",
]);

// Define thresholds based on ore rarity
const XRAY_THRESHOLDS: Record<string, number> = {
    "minecraft:iron_ore": 5,
    "minecraft:gold_ore": 5,
    "minecraft:lapis_ore": 5,
    "minecraft:deepslate_iron_ore": 5,
    "minecraft:deepslate_gold_ore": 5,
    "minecraft:deepslate_lapis_ore": 5,
    "minecraft:redstone_ore": 4,
    "minecraft:deepslate_redstone_ore": 4,
    "minecraft:diamond_ore": 3,
    "minecraft:deepslate_diamond_ore": 3,
    "minecraft:emerald_ore": 3,
    "minecraft:deepslate_emerald_ore": 3,
    "minecraft:ancient_debris": 2,
};

// Interface for tracking player Xray activity
interface XrayData {
    lastNotifyTime: number; // Last notify time in ticks
}

// Data structures to track Xray-related information
const xrayData: Map<string, XrayData> = new Map();
const blocksBrokenCount: Map<string, number> = new Map();

/**
 * Determines if a player is suspicious based on the number of blocks they've broken and the time window.
 * @param playerId - The player's ID.
 * @param blockId - The block type ID.
 * @returns {boolean} - Whether the player is suspicious for Xray behavior.
 */
function isXraySuspicious(playerId: string, blockId: string): boolean {
    const threshold = XRAY_THRESHOLDS[blockId];
    if (!threshold) return false; // Block is not an Xray block, no need to check

    const data = xrayData.get(playerId);
    if (!data) return false;

    const currentTick = system.currentTick;
    let timeSinceLastNotify = currentTick - data.lastNotifyTime;

    // If the time gap exceeds 1200 ticks (60 seconds), reset the timer
    if (timeSinceLastNotify > 1200) {
        data.lastNotifyTime = currentTick; // Reset the last notify time to current tick
        timeSinceLastNotify = 0; // Reset time gap
    }

    // Check if the player broke enough blocks within 1200 ticks (60 seconds threshold)
    return blocksBrokenCount.get(playerId)! >= threshold && timeSinceLastNotify <= 1200;
}

/**
 * Cleans up player data when they leave the game.
 * @param event - The event object for player logout.
 */
function onPlayerLogout(event: PlayerLeaveAfterEvent): void {
    const playerId = event.playerId;
    xrayData.delete(playerId);
    blocksBrokenCount.delete(playerId);
}

/**
 * Handles the block break event and checks for suspicious Xray activity.
 * @param event - The event object for player breaking a block.
 */
function handleBlockBreak(event: PlayerBreakBlockAfterEvent): void {
    const { player, brokenBlockPermutation } = event;
    const playerId = player.id;
    const blockId = brokenBlockPermutation.type.id;

    // Only check if the block is an Xray block
    if (XRAY_BLOCKS.has(blockId)) {
        // Retrieve or initialize player data
        let playerData = xrayData.get(playerId);
        if (!playerData) {
            playerData = { lastNotifyTime: system.currentTick - 1 }; // Initialize lastNotifyTime to current tick - 1
            xrayData.set(playerId, playerData);
        }

        let blockCount = blocksBrokenCount.get(playerId) ?? 0;
        blocksBrokenCount.set(playerId, blockCount + 1);

        // Check if the player is suspicious
        if (isXraySuspicious(playerId, blockId)) {
            const { x, y, z } = player.location;
            const level4Players = getSecurityClearanceLevel4Players();
            level4Players.forEach((player) => {
                player.sendMessage(`§2[§7Paradox§2]§7 §4[§7Xray§4]§o§f ${player.name}§f§7 has found §2[§7${blockId.replace("minecraft:", "")}§2]§7 §2x${blockCount + 1}§7 at X=§f${x.toFixed(0)}§7 Y=§f${y.toFixed(0)}§7 Z=§f${z.toFixed(0)}.`);
            });

            // Reset the block count after notifying
            blocksBrokenCount.set(playerId, 0);

            // Update lastNotifyTime to the current tick only after the player is flagged
            playerData.lastNotifyTime = system.currentTick;
        }
    }
}

/**
 * Initializes the Xray detection system by subscribing to relevant events.
 */
export function startXrayDetection() {
    world.afterEvents.playerBreakBlock.subscribe(handleBlockBreak);
    world.afterEvents.playerLeave.subscribe(onPlayerLogout);
}

/**
 * Stops the Xray detection system and unsubscribes from events.
 */
export function stopXrayDetection() {
    world.afterEvents.playerBreakBlock.unsubscribe(handleBlockBreak);
    world.afterEvents.playerLeave.unsubscribe(onPlayerLogout);
    xrayData.clear();
    blocksBrokenCount.clear();
}
