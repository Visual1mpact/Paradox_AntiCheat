import { system } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

let visionEnabled = false;
let visionCheckInterval: number | null = null;

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
        const blockTarget = player.getBlockFromViewDirection({ maxDistance: 10 });
        if (!blockTarget) continue;

        const blockComponent = blockTarget.block?.getComponent("minecraft:inventory");
        const blockContainer = blockComponent?.container;
        if (!blockContainer) continue;

        const itemCounts: Record<string, number> = {};
        for (let i = 0; i < blockContainer.size; i++) {
            const item = blockContainer.getItem(i);
            if (!item) continue;
            const formattedName = formatItemName(item.typeId);
            itemCounts[formattedName] = (itemCounts[formattedName] || 0) + item.amount;
        }

        const displayText =
            Object.entries(itemCounts)
                .map(([name, count]) => `§2[§f${name}§2]§7 Amount: §2x${count}§f`)
                .join("\n") || "§cContainer Is Empty";

        player.onScreenDisplay.setActionBar(displayText);
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
