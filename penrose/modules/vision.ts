import { system } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

let visionEnabled = false;
let visionCheckInterval: number | null = null;

const ITEMS_PER_PAGE = 6; // How many different items to show per page
const ROTATE_EVERY_N_CHECKS = 3; // Rotate to the next page every N interval executions (~90 ticks)

const playerPageMap = new Map<string, number>(); // player id → current page index
const playerPageCooldowns = new Map<string, number>(); // player id → interval counter
const playerLastContainerPos = new Map<string, string>(); // player id → "x,y,z:dimensionId"

/**
 * Human-readable item name from a vanilla item ID.
 *
 * @example
 * formatItemName("minecraft:diamond_sword"); // "Diamond Sword"
 *
 * @param itemTypeId - Raw item type ID (e.g. `"minecraft:diamond_sword"`).
 * @returns Title-cased item name (e.g. `"Diamond Sword"`).
 */
function formatItemName(itemTypeId: string): string {
    return itemTypeId
        .replace(/^minecraft:/, "")
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

/**
 * Clears all pagination / cooldown state for the given player ID.
 */
function cleanup(id: string): void {
    playerPageMap.delete(id);
    playerPageCooldowns.delete(id);
    playerLastContainerPos.delete(id);
}

/**
 * Runs once every interval while enabled.
 * Detects containers a level-4 player is looking at and shows their contents
 * in the action-bar, with simple pagination that auto-rotates.
 */
function runVisionCheck(): void {
    const players = getSecurityClearanceLevel4Players();
    if (players.size === 0) return;

    for (const player of players) {
        const id = player.id;
        const target = player.getBlockFromViewDirection({ maxDistance: 10 });

        /* Reset state if nothing (or a non-container block) is found */
        if (!target) {
            cleanup(id);
            continue;
        }

        const inv = target.block?.getComponent("minecraft:inventory")?.container;
        if (!inv) {
            cleanup(id);
            continue;
        }

        /* Detect when player switches to a new container and reset pagination */
        const posKey = `${target.block.x},${target.block.y},${target.block.z}:${target.block.dimension.id}`;
        if (playerLastContainerPos.get(id) !== posKey) {
            playerLastContainerPos.set(id, posKey);
            playerPageMap.set(id, 0);
            playerPageCooldowns.set(id, 0);
        }

        /* Count items */
        const counts: Record<string, number> = {};
        for (let i = 0; i < inv.size; i++) {
            const item = inv.getItem(i);
            if (item) {
                const name = formatItemName(item.typeId);
                counts[name] = (counts[name] ?? 0) + item.amount;
            }
        }

        /* Render action bar */
        const entries = Object.entries(counts);
        if (entries.length === 0) {
            player.onScreenDisplay.setActionBar("§cContainer is empty");
            playerPageMap.set(id, 0);
            continue;
        }

        const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);
        const currentPage = playerPageMap.get(id) ?? 0;
        const start = currentPage * ITEMS_PER_PAGE;
        const pageEntries = entries.slice(start, start + ITEMS_PER_PAGE);

        let text = pageEntries.map(([name, amt]) => `§2[§f${name}§2]§7 Amount: §2x${amt}§f`).join("\n");

        if (totalPages > 1) text += `\n§8Page ${currentPage + 1} of ${totalPages}`;
        player.onScreenDisplay.setActionBar(text);

        /* Handle auto-rotation */
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
 * Begins periodic vision checks (every 30 ticks).
 * Respects the `visionCheck_b` flag in `paradoxModulesDB`.
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
}
