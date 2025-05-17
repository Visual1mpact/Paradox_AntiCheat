import { system } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

let visionEnabled = false;
let visionCheckInterval: number | null = null;
const ITEMS_PER_PAGE = 6;
const playerPageMap = new Map<string, number>();
const playerPageCooldowns = new Map<string, number>(); // cooldown counter per player
const ROTATE_EVERY_N_CHECKS = 3; // rotate page every 3 checks (~3 x 30 = 90 ticks)

/**
 * Formats the given item type ID into a readable name.
 * @param itemTypeId - The item type ID (e.g., "minecraft:diamond_sword").
 * @returns A formatted string (e.g., "Diamond Sword").
 */
function formatItemName(itemTypeId: string): string {
    return itemTypeId
        .replace(/^minecraft:/, "")
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

/**
 * Runs the vision check for all security level 4 players, displaying container contents if applicable.
 */
function runVisionCheck() {
    const players = getSecurityClearanceLevel4Players();
    if (players.size === 0) return;

    for (const player of players) {
        const id = player.id;
        const blockTarget = player.getBlockFromViewDirection({ maxDistance: 10 });
        if (!blockTarget) {
            playerPageMap.delete(id);
            continue;
        }

        const blockComponent = blockTarget.block?.getComponent("minecraft:inventory");
        const blockContainer = blockComponent?.container;
        if (!blockContainer) {
            playerPageMap.delete(id);
            continue;
        }

        const itemCounts: Record<string, number> = {};
        for (let i = 0; i < blockContainer.size; i++) {
            const item = blockContainer.getItem(i);
            if (!item) continue;
            const formattedName = formatItemName(item.typeId);
            itemCounts[formattedName] = (itemCounts[formattedName] || 0) + item.amount;
        }

        const entries = Object.entries(itemCounts);
        if (entries.length === 0) {
            player.onScreenDisplay.setActionBar("§cContainer Is Empty");
            playerPageMap.set(id, 0);
            continue;
        }

        const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);
        const currentPage = playerPageMap.get(id) ?? 0;
        const start = currentPage * ITEMS_PER_PAGE;
        const pageEntries = entries.slice(start, start + ITEMS_PER_PAGE);

        let displayText = pageEntries.map(([name, count]) => `§2[§f${name}§2]§7 Amount: §2x${count}§f`).join("\n");

        if (totalPages > 1) {
            displayText += `\n§8Page ${currentPage + 1} of ${totalPages}`;
        }

        player.onScreenDisplay.setActionBar(displayText);

        // Rotate to next page
        const cooldown = (playerPageCooldowns.get(id) ?? 0) + 1;
        if (cooldown >= ROTATE_EVERY_N_CHECKS) {
            playerPageMap.set(id, (currentPage + 1) % totalPages);
            playerPageCooldowns.set(id, 0);
        } else {
            playerPageCooldowns.set(id, cooldown);
        }
    }
}

/**
 * Starts the vision check interval, updating every 30 ticks.
 * Ensures that vision checks do not run if manually disabled.
 */
export function startVisionCheck() {
    if (visionCheckInterval !== null) {
        stopVisionCheck();
    }
    visionEnabled = true;
    visionCheckInterval = system.runInterval(() => {
        if (!visionEnabled || paradoxModulesDB.get("visionCheck_b") === false) {
            stopVisionCheck();
            return;
        }
        runVisionCheck();
    }, 30);
}

/**
 * Stops the vision check interval and resets the state.
 */
export function stopVisionCheck() {
    if (visionCheckInterval !== null) {
        system.clearRun(visionCheckInterval);
        visionCheckInterval = null;
    }
    visionEnabled = false;
}
