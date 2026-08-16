/**
 * Minecraft Vision Module: Shows the contents of containers or player inventories in action bars.
 */

import { system, Player, Container } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

/** Flag indicating whether the module is manually toggled on */
let isModuleActive = false;
/** Flag indicating whether the background generator worker is processing a frame */
let isJobActive = false;

/** Number of items to show per page */
const ITEMS_PER_PAGE = 6;
/** Number of checks before rotating to the next page */
const ROTATE_EVERY_N_CHECKS = 3;
/** Throttle delay (in ticks) between vision evaluations per player */
const VISION_THROTTLE_TICKS = 30;

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
    /** Last system tick timestamp when this player was processed */
    lastProcessedTick: number;
}

/** Map of player ID to their vision state */
const playerStates = new Map<string, PlayerState>();

/**
 * Converts a Minecraft item type ID to a human-readable name.
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
 */
function cleanupPlayerState(id: string) {
    playerStates.delete(id);
}

/**
 * Retrieves or initializes the vision state for a player.
 */
function getPlayerState(id: string): PlayerState {
    if (!playerStates.has(id)) {
        playerStates.set(id, { page: 0, cooldown: 0, lastContainerPos: null, lastProcessedTick: 0 });
    }
    return playerStates.get(id)!;
}

/**
 * Renders the inventory counts to the player's action bar with pagination and auto-rotation.
 */
function renderInventory(player: Player, counts: Record<string, number>, state: PlayerState) {
    const entries = Object.entries(counts);
    if (entries.length === 0) {
        player.onScreenDisplay.setActionBar("§cInventory is empty");
        return;
    }

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
 */
function getContainerCounts(container: Container): Record<string, number> {
    const counts: Record<string, number> = {};
    for (let i = 0; i < container.size; i++) {
        try {
            const item = container.getItem(i);
            if (item) {
                const name = formatItemName(item.typeId);
                counts[name] = (counts[name] ?? 0) + item.amount;
            }
        } catch {
            // Gracefully catch cases where items are transiently inaccessible
            continue;
        }
    }
    return counts;
}

/**
 * Helper to safely pre-fetch the database setting before invoking the generator pass.
 */
async function isVisionModuleEnabledInDB(): Promise<boolean> {
    try {
        const moduleConfig = (await paradoxModulesDB.get("visionCheck_b")) as { enabled?: boolean } | undefined;
        return moduleConfig?.enabled ?? false;
    } catch {
        return false;
    }
}

/**
 * Continuous generator loop that iterates over staff members to perform vision checks.
 */
function* continuousVisionLoop(isEnabledInDB: boolean): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        if (!isModuleActive || !isEnabledInDB) return;

        const players = getSecurityClearanceLevel4Players();
        const currentTick = system.currentTick;

        for (const player of players) {
            if (!player?.isValid) continue;

            const state = getPlayerState(player.id);

            // Throttle execution per player to preserve action bar display timing
            if (currentTick - state.lastProcessedTick < VISION_THROTTLE_TICKS) {
                continue;
            }
            state.lastProcessedTick = currentTick;

            try {
                // Raycast for blocks and entities separately
                const blockHit = player.getBlockFromViewDirection({ maxDistance: 10 });
                const entityHits = player.getEntitiesFromViewDirection({ maxDistance: 10 }) || [];

                let targetBlock = blockHit?.block ?? null;
                let targetPlayer: Player | null = null;

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

                renderInventory(player, counts, state);
            } catch (e) {
                console.error(`[Paradox] Error during vision pass: ${e}`);
            }

            // Yield control back to engine processing after processing each target
            yield;
        }
    } finally {
        // Unlock job state for the current pass
        isJobActive = false;

        // Queue up the next loop execution asynchronously if module state remains active
        if (isModuleActive) {
            system.run(async () => {
                if (!isModuleActive) return;
                const enabled = await isVisionModuleEnabledInDB();
                if (enabled && isModuleActive) {
                    system.runJob(continuousVisionLoop(enabled));
                }
            });
        }
    }
}

/**
 * Starts periodic vision checks smoothly.
 */
export async function startVisionCheck(): Promise<void> {
    if (isModuleActive) return;
    isModuleActive = true;

    if (!isJobActive) {
        const isEnabled = await isVisionModuleEnabledInDB();
        if (isEnabled && isModuleActive) {
            system.runJob(continuousVisionLoop(isEnabled));
        }
    }
}

/**
 * Stops vision checks and clears all per-player state.
 */
export function stopVisionCheck(): void {
    isModuleActive = false;
    playerStates.clear();
}
