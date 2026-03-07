/**
 * Minecraft Vision Module: Shows the contents of containers or player inventories in action bars.
 */

import { system, Player, Container } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

/** Whether vision check is currently enabled */
let visionEnabled = false;
/** Interval ID for periodic vision checks */
let visionCheckInterval: number | null = null;

/** Number of items to show per page */
const ITEMS_PER_PAGE = 6;
/** Number of checks before rotating to the next page */
const ROTATE_EVERY_N_CHECKS = 3;

/**
 * State object for each player viewing inventories
 */
interface PlayerState {
    /** Current page index for pagination */
    page: number;
    /** Countdown for auto-rotation */
    cooldown: number;
    /** Last container or player position key */
    lastContainerPos: string | null;
}

/** Map of player ID to their vision state */
const playerStates = new Map<string, PlayerState>();

/**
 * Converts a Minecraft item type ID to a human-readable name.
 * @param itemTypeId Raw Minecraft item ID (e.g., 'minecraft:diamond_sword')
 * @returns Title-cased item name (e.g., 'Diamond Sword')
 */
function formatItemName(itemTypeId: string): string {
    return itemTypeId
        .replace(/^minecraft:/, "")
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

/**
 * Removes the stored vision state for a player.
 * @param id Player ID
 */
function cleanupPlayerState(id: string) {
    playerStates.delete(id);
}

/**
 * Retrieves or initializes the vision state for a player.
 * @param id Player ID
 * @returns PlayerState object
 */
function getPlayerState(id: string): PlayerState {
    if (!playerStates.has(id)) {
        playerStates.set(id, { page: 0, cooldown: 0, lastContainerPos: null });
    }
    return playerStates.get(id)!;
}

/**
 * Renders the inventory counts to the player's action bar with pagination and auto-rotation.
 * @param player Player to show the inventory for
 * @param counts Object mapping item names to amounts
 */
function renderInventory(player: Player, counts: Record<string, number>) {
    const entries = Object.entries(counts);
    if (entries.length === 0) {
        player.onScreenDisplay.setActionBar("§cInventory is empty");
        return;
    }

    const state = getPlayerState(player.id);
    const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);
    const currentPage = state.page;
    const start = currentPage * ITEMS_PER_PAGE;
    const pageEntries = entries.slice(start, start + ITEMS_PER_PAGE);

    let text = pageEntries.map(([name, amt]) => `§2[§f${name}§2]§7 Amount: §2x${amt}§f`).join("\n");
    if (totalPages > 1) text += `\n§8Page ${currentPage + 1} of ${totalPages}`;

    player.onScreenDisplay.setActionBar(text);

    // Handle auto-rotation
    state.cooldown++;
    if (state.cooldown >= ROTATE_EVERY_N_CHECKS) {
        state.page = (currentPage + 1) % totalPages;
        state.cooldown = 0;
    }
}

/**
 * Counts the items in a container.
 * @param container Container object from Minecraft API
 * @returns Object mapping item names to amounts
 */
function getContainerCounts(container: Container): Record<string, number> {
    const counts: Record<string, number> = {};
    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item) {
            const name = formatItemName(item.typeId);
            counts[name] = (counts[name] ?? 0) + item.amount;
        }
    }
    return counts;
}

/**
 * Performs a single vision check for all level-4 players, showing container or player inventories.
 */
function runVisionCheck(): void {
    const players = getSecurityClearanceLevel4Players();
    if (players.size === 0) return;

    for (const player of players) {
        const state = getPlayerState(player.id);

        // Raycast for blocks and entities separately
        const blockHit = player.getBlockFromViewDirection({ maxDistance: 10 });
        const entityHits = player.getEntitiesFromViewDirection({ maxDistance: 10 }) || [];

        let targetBlock = null;
        let targetPlayer: Player | null = null;

        if (blockHit) targetBlock = blockHit.block;

        const firstPlayerHit = entityHits.find((hit) => hit.entity instanceof Player);
        if (firstPlayerHit) targetPlayer = firstPlayerHit.entity as Player;

        if (!targetBlock && !targetPlayer) {
            cleanupPlayerState(player.id);
            continue;
        }

        let counts: Record<string, number> | null = null;

        if (targetBlock) {
            const container = targetBlock.getComponent("minecraft:inventory")?.container;
            if (!container) {
                cleanupPlayerState(player.id);
                continue;
            }

            const posKey = `${targetBlock.x},${targetBlock.y},${targetBlock.z}:${targetBlock.dimension.id}`;
            if (state.lastContainerPos !== posKey) {
                state.page = 0;
                state.cooldown = 0;
                state.lastContainerPos = posKey;
            }

            counts = getContainerCounts(container);
        }

        if (targetPlayer) {
            const inv = targetPlayer.getComponent("minecraft:inventory")?.container;
            if (inv) {
                counts = getContainerCounts(inv);
                const posKey = `player:${targetPlayer.id}`;
                if (state.lastContainerPos !== posKey) {
                    state.page = 0;
                    state.cooldown = 0;
                    state.lastContainerPos = posKey;
                }
            }
        }

        if (!counts) {
            cleanupPlayerState(player.id);
            continue;
        }

        renderInventory(player, counts);
    }
}

/**
 * Starts periodic vision checks every 30 ticks.
 * Respects the `visionCheck_b` flag in paradoxModulesDB.
 */
export function startVisionCheck(): void {
    if (visionCheckInterval !== null) stopVisionCheck();

    visionEnabled = true;
    visionCheckInterval = system.runInterval(() => {
        if (!visionEnabled || paradoxModulesDB.get("visionCheck_b")?.enabled === false) {
            stopVisionCheck();
            return;
        }
        runVisionCheck();
    }, 30);
}

/**
 * Stops vision checks and clears all per-player state.
 */
export function stopVisionCheck(): void {
    if (visionCheckInterval !== null) {
        system.clearRun(visionCheckInterval);
        visionCheckInterval = null;
    }
    visionEnabled = false;
    playerStates.clear();
}
