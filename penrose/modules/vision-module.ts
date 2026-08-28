import { system, Player, Container, Block } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";

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

interface TargetContainer {
    container: Container;
    posKey: string;
}

/** Map of player ID to their vision state */
const playerStates = new Map<string, PlayerState>();

/**
 * Converts a Minecraft item type ID to a human-readable name.
 * @param {string} itemTypeId - Raw item type identifier.
 * @returns {string} Formatted human-readable name.
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
 * @param {string} id - Player ID to clean up.
 */
function cleanupPlayerState(id: string): void {
    playerStates.delete(id);
}

/**
 * Retrieves or initializes the vision state for a player.
 * @param {string} id - Player ID.
 * @returns {PlayerState} Stored or new state structure.
 */
function getPlayerState(id: string): PlayerState {
    if (!playerStates.has(id)) {
        playerStates.set(id, { page: 0, cooldown: 0, lastContainerPos: null, lastProcessedTick: 0 });
    }
    return playerStates.get(id)!;
}

/**
 * Renders the inventory counts to the player's action bar with pagination and auto-rotation.
 * @param {Player} player - Staff player viewing information.
 * @param {Record<string, number>} counts - Map of item names to quantities.
 * @param {PlayerState} state - Viewer's current tracking state.
 */
function renderInventory(player: Player, counts: Record<string, number>, state: PlayerState): void {
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

    state.cooldown++;
    if (state.cooldown >= ROTATE_EVERY_N_CHECKS) {
        state.page = (currentPage + 1) % totalPages;
        state.cooldown = 0;
    }
}

/**
 * Counts the items in a container.
 * @param {Container} container - Minecraft inventory container.
 * @returns {Record<string, number>} Item names mapped to amounts.
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
            continue;
        }
    }
    return counts;
}

/**
 * Helper to safely pre-fetch the database setting before invoking the generator pass.
 * @returns {Promise<boolean>} True if module is enabled in persistent DB.
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
 * Resolves target container from block vision raycast.
 * @param {Block | null} block - Block target from raycast.
 * @returns {TargetContainer | null} Target container and position key or null.
 */
function getBlockTargetContainer(block: Block | null): TargetContainer | null {
    if (!block) return null;
    const container = block.getComponent("minecraft:inventory")?.container;
    if (!container) return null;

    return {
        container,
        posKey: `${block.x},${block.y},${block.z}:${block.dimension.id}`,
    };
}

/**
 * Resolves target container from target player entity raycast.
 * @param {Player | null} targetPlayer - Player target from raycast.
 * @returns {TargetContainer | null} Target container and position key or null.
 */
function getPlayerTargetContainer(targetPlayer: Player | null): TargetContainer | null {
    if (!targetPlayer) return null;
    const container = targetPlayer.getComponent("minecraft:inventory")?.container;
    if (!container) return null;

    return {
        container,
        posKey: `player:${targetPlayer.id}`,
    };
}

/**
 * Resolves vision target container from block or entity raycast.
 * @param {Player} player - Viewer player inspecting target.
 * @returns {TargetContainer | null} Target container structure or null.
 */
function resolveVisionTargetContainer(player: Player): TargetContainer | null {
    const blockHit = player.getBlockFromViewDirection({ maxDistance: 10 });
    const blockTarget = getBlockTargetContainer(blockHit?.block ?? null);
    if (blockTarget) return blockTarget;

    const entityHits = player.getEntitiesFromViewDirection({ maxDistance: 10 }) || [];
    const firstPlayerHit = entityHits.find((hit) => hit.entity instanceof Player);
    return getPlayerTargetContainer((firstPlayerHit?.entity as Player) ?? null);
}

/**
 * Evaluates vision inspection for a single staff player.
 * @param {Player} player - Staff viewer player.
 * @param {number} currentTick - Current system tick.
 */
function evaluatePlayerVision(player: Player, currentTick: number): void {
    const state = getPlayerState(player.id);

    if (currentTick - state.lastProcessedTick < VISION_THROTTLE_TICKS) {
        return;
    }
    state.lastProcessedTick = currentTick;

    const target = resolveVisionTargetContainer(player);
    if (!target) {
        cleanupPlayerState(player.id);
        return;
    }

    if (state.lastContainerPos !== target.posKey) {
        state.page = 0;
        state.cooldown = 0;
        state.lastContainerPos = target.posKey;
    }

    const counts = getContainerCounts(target.container);
    renderInventory(player, counts, state);
}

/**
 * Continuous generator loop that iterates over staff members to perform vision checks.
 * @param {boolean} isEnabledInDB - Database enablement status.
 * @yields Control back to the server job scheduler after processing a target.
 */
function* continuousVisionLoop(isEnabledInDB: boolean): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        if (!isModuleActive || !isEnabledInDB) return;

        const players = SecurityClearanceManager.getSecurityClearanceLevel4Players();
        const currentTick = system.currentTick;

        for (const player of players) {
            if (!player?.isValid) continue;

            try {
                evaluatePlayerVision(player, currentTick);
            } catch (e) {
                console.error(`[Paradox] Error during vision pass: ${e}`);
            }

            yield;
        }
    } finally {
        isJobActive = false;

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
 * @returns {Promise<void>}
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
