import { Block, Dimension, Player, PlayerBreakBlockAfterEvent, PlayerBreakBlockBeforeEvent, PlayerInteractWithBlockAfterEvent, PlayerInteractWithBlockBeforeEvent, PlayerPlaceBlockAfterEvent, system, world } from "@minecraft/server";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { chestLockDB } from "../event-listeners/world-initialize";

/** ------------------- CONFIG & HELPERS ------------------- */

/**
 * A set of block type IDs that are considered lockable storage containers.
 */
const STORAGE_BLOCKS = new Set(["minecraft:chest", "minecraft:barrel", "minecraft:ender_chest", "minecraft:trapped_chest"]);

/**
 * Determines whether a block is a supported storage container.
 * Includes vanilla storage blocks and all shulker box variants.
 *
 * @param {Block} block - The block to evaluate.
 * @returns {boolean} True if the block is a storage container.
 */
function isStorageBlock(block: Block): boolean {
    return STORAGE_BLOCKS.has(block.typeId) || /^minecraft:.*_shulker_box$/.test(block.typeId);
}

/**
 * Generates a unique key for a block based on its dimension and coordinates.
 *
 * @param {Block} block - The block to generate a key for.
 * @returns {string} A unique location key (dimension_x_y_z).
 */
function getBlockLocationKey(block: Block): string {
    const x = Math.floor(block.x);
    const y = Math.floor(block.y);
    const z = Math.floor(block.z);
    return `${block.dimension.id}_${x}_${y}_${z}`;
}

/**
 * Attempts to find an adjacent chest to support double chest handling.
 *
 * @param {Block} block - The base chest block.
 * @param {Dimension} dimension - The dimension the block exists in.
 * @returns {Block | null} The adjacent chest block if found.
 */
function getAdjacentChest(block: Block, dimension: Dimension): Block | null {
    if (!block || (block.typeId !== "minecraft:chest" && block.typeId !== "minecraft:trapped_chest")) return null;

    const { x, y, z } = block.location;
    const neighbors = [
        { x: x + 1, y, z },
        { x: x - 1, y, z },
        { x, y, z: z + 1 },
        { x, y, z: z - 1 },
    ];

    for (const pos of neighbors) {
        const adj = dimension.getBlock(pos);
        if (adj?.typeId === block.typeId) return adj;
    }

    return null;
}

/**
 * Computes a canonical key for a chest, ensuring double chests share one key.
 *
 * @param {Block} block - The chest block.
 * @returns {string} A consistent key for single or double chests.
 */
function getCanonicalChestKey(block: Block): string {
    const adj = getAdjacentChest(block, block.dimension);
    if (!adj) return getBlockLocationKey(block);

    const keys = [block, adj].sort((a, b) => a.x - b.x || a.z - b.z || a.y - b.y);
    return getBlockLocationKey(keys[0]);
}

/**
 * Checks if a player has level 4 security clearance.
 *
 * @param {Player} player - The player to check.
 * @returns {boolean} True if the player has clearance.
 */
function hasLevel4Clearance(player: Player): boolean {
    return getSecurityClearanceLevel4Players().has(player);
}

/**
 * Sends a message to all players with level 4 clearance.
 *
 * @param {string} message - The message to send.
 */
function notifyLevel4Players(message: string): void {
    getSecurityClearanceLevel4Players().forEach((p) => p.sendMessage(message));
}

/** ------------------- CHEST DATABASE HELPERS ------------------- */

/**
 * Retrieves the owner of a locked chest.
 *
 * @param {Block} block - The chest block.
 * @returns {string | null} The owner's name, or null if unlocked.
 */
function getChestOwner(block: Block): string | null {
    const key = getCanonicalChestKey(block);
    return chestLockDB.get(key)?.owner ?? null;
}

/**
 * Logs a chest access event for auditing purposes.
 * Creates a new entry if the chest does not exist in the database.
 *
 * @param {Block} block - The chest block.
 * @param {string} playerName - The player accessing the chest.
 */
async function logChestAccess(block: Block, playerName: string): Promise<void> {
    const key = getCanonicalChestKey(block);
    const timestamp = Date.now();
    const entry = chestLockDB.get(key);

    const logEntry = { player: playerName, time: timestamp };

    if (entry) {
        const updated = {
            ...entry,
            placedBy: entry.placedBy,
            lastAccessed: timestamp,
            accessLog: entry.accessLog ? [...entry.accessLog, logEntry] : [logEntry],
        };
        await chestLockDB.set(key, updated);
    } else {
        await chestLockDB.set(key, {
            owner: playerName,
            lastAccessed: timestamp,
            accessLog: [logEntry],
        });
    }
}

/**
 * Removes old log entries beyond a retention period.
 *
 * @param {number} retentionDays - Number of days to keep logs (default: 30).
 */
async function pruneOldLogs(retentionDays = 30): Promise<void> {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    for (const [key, value] of chestLockDB.entries()) {
        if (!value.accessLog) continue;

        const prunedLog = value.accessLog.filter((e) => e.time >= cutoff);

        if (prunedLog.length !== value.accessLog.length) {
            await chestLockDB.set(key, { ...value, accessLog: prunedLog });
        }
    }
}

/** ------------------- CHEST EVENT HANDLERS ------------------- */

/**
 * Handles chest interaction BEFORE it occurs.
 * Used to enforce lock restrictions and prevent unauthorized access.
 *
 * @param {PlayerInteractWithBlockBeforeEvent} event
 */
async function chestLockBefore(event: PlayerInteractWithBlockBeforeEvent): Promise<void> {
    const { block, player } = event;
    if (!isStorageBlock(block)) return;

    const owner = getChestOwner(block);
    if (!owner) return;

    if (player.name === owner || hasLevel4Clearance(player)) {
        player.sendMessage(`§2[§7Paradox§2]§o§7 This chest is locked by ${owner}. You can override it.`);
        notifyLevel4Players(`§2[§7Paradox§2]§o§7 §4[LOG]§7 ${player.name} accessed locked chest by ${owner} at ${getCanonicalChestKey(block)}`);
        await logChestAccess(block, player.name);
        return;
    }

    player.sendMessage(`§2[§7Paradox§2]§o§7 This chest is locked by ${owner}. You cannot access it.`);
    notifyLevel4Players(`§2[§7Paradox§2]§o§7 §4[LOG]§7 ${player.name} tried to access locked chest by ${owner} at ${getCanonicalChestKey(block)}`);
    event.cancel = true;

    await logChestAccess(block, player.name);
}

/**
 * Handles chest interaction AFTER it occurs.
 * Used for locking/unlocking via a specific item (key).
 *
 * @param {PlayerInteractWithBlockAfterEvent} event
 */
async function chestLockAfter(event: PlayerInteractWithBlockAfterEvent): Promise<void> {
    const { block, player, itemStack } = event;
    if (!isStorageBlock(block)) return;
    if (!itemStack || itemStack.typeId !== "minecraft:stick") return;

    const key = getCanonicalChestKey(block);
    const entry = chestLockDB.get(key);
    const owner = entry?.owner ?? null;
    const placer = entry?.placedBy ?? null;
    const timestamp = Date.now();

    if (!owner) {
        // Enforce placement ownership
        if (placer && placer !== player.name && !hasLevel4Clearance(player)) {
            player.sendMessage(`§2[§7Paradox§2]§o§7 Only the player who placed this can lock it.`);
            return;
        }

        await chestLockDB.set(key, {
            ...entry,
            owner: player.name,
            placedBy: placer ?? player.name, // fallback if unknown
            lastAccessed: timestamp,
            accessLog: [{ player: player.name, time: timestamp }],
        });

        player.sendMessage(`§2[§7Paradox§2]§o§7 You have locked this chest.`);
        notifyLevel4Players(`§2[§7Paradox§2]§o§7 §4[LOG]§7 ${player.name} locked chest at ${key}`);
        return;
    }

    if (owner === player.name || hasLevel4Clearance(player)) {
        await chestLockDB.delete(key);

        player.sendMessage(`§2[§7Paradox§2]§o§7 You have unlocked this chest.`);
        notifyLevel4Players(`§2[§7Paradox§2]§o§7 §4[LOG]§7 ${player.name} unlocked chest at ${key}`);
        player.playSound("open.iron_door", { location: block.location });
    }
}

/**
 * Prevents breaking of locked chests by unauthorized players.
 *
 * @param {PlayerBreakBlockBeforeEvent} event
 */
async function chestLockBreakBefore(event: PlayerBreakBlockBeforeEvent): Promise<void> {
    const { block, player } = event;
    if (!isStorageBlock(block)) return;

    const owner = getChestOwner(block);
    if (!owner) return;

    if (player.name !== owner && !hasLevel4Clearance(player)) {
        player.sendMessage(`§2[§7Paradox§2]§o§7 This chest is locked by ${owner}. You cannot break it.`);
        notifyLevel4Players(`§2[§7Paradox§2]§o§7 §4[LOG]§7 ${player.name} tried to break locked chest by ${owner} at ${getCanonicalChestKey(block)}`);
        event.cancel = true;

        await logChestAccess(block, player.name);
    }
}

/**
 * Handles cleanup AFTER a storage block is successfully broken.
 * Removes all associated data including ownership, placement, and access logs.
 *
 * @param {PlayerBreakBlockAfterEvent} event - The block break event data.
 */
async function chestLockBreakAfter(event: PlayerBreakBlockAfterEvent): Promise<void> {
    const { block } = event;

    if (!isStorageBlock(block)) return;

    const key = getCanonicalChestKey(block);

    // Completely remove all data (owner + placedBy + logs)
    await chestLockDB.delete(key);
}

/**
 * Handles storage block placement AFTER it occurs.
 * Records the player who placed the block if no existing record is found.
 *
 * @param {PlayerPlaceBlockAfterEvent} event - The block placement event data.
 */
async function chestLockPlaceAfter(event: PlayerPlaceBlockAfterEvent): Promise<void> {
    const { block, player } = event;

    if (!isStorageBlock(block)) return;

    const key = getCanonicalChestKey(block);
    const existing = chestLockDB.get(key);

    // Don't overwrite if already tracked (important for double chests / reloads)
    if (!existing) {
        await chestLockDB.set(key, {
            placedBy: player.name,
            lastAccessed: Date.now(),
            accessLog: [],
        });
    }
}

/** ------------------- MODULE CONTROL ------------------- */

/**
 * Active subscription references for event listeners.
 */
let beforeSub: ((event: PlayerInteractWithBlockBeforeEvent) => void) | null = null;
let afterSub: ((event: PlayerInteractWithBlockAfterEvent) => void) | null = null;
let breakSub: ((event: PlayerBreakBlockBeforeEvent) => void) | null = null;
let afterBreakSub: ((event: PlayerBreakBlockAfterEvent) => void) | null = null;
let afterPlaceSub: ((event: PlayerPlaceBlockAfterEvent) => void) | null = null;
let intervalHandle: number | null = null;

/**
 * Starts the chest lock system by subscribing to relevant events.
 */
function startChestLock() {
    if (beforeSub || afterSub || breakSub) return;

    beforeSub = (event) => chestLockBefore(event);
    afterSub = (event) => chestLockAfter(event);
    breakSub = (event) => chestLockBreakBefore(event);
    afterBreakSub = (event) => chestLockBreakAfter(event);
    afterPlaceSub = (event) => chestLockPlaceAfter(event);

    world.beforeEvents.playerInteractWithBlock.subscribe(beforeSub);
    world.afterEvents.playerInteractWithBlock.subscribe(afterSub);
    world.beforeEvents.playerBreakBlock.subscribe(breakSub);
    world.afterEvents.playerBreakBlock.subscribe(afterBreakSub);
    world.afterEvents.playerPlaceBlock.subscribe(afterPlaceSub);

    intervalHandle = system.runInterval(() => pruneOldLogs(30), 72000);
}

/**
 * Stops the chest lock system and unsubscribes all listeners.
 */
function stopChestLock() {
    if (beforeSub) world.beforeEvents.playerInteractWithBlock.unsubscribe(beforeSub);
    if (afterSub) world.afterEvents.playerInteractWithBlock.unsubscribe(afterSub);
    if (breakSub) world.beforeEvents.playerBreakBlock.unsubscribe(breakSub);
    if (afterBreakSub) world.afterEvents.playerBreakBlock.unsubscribe(afterBreakSub);
    if (afterPlaceSub) world.afterEvents.playerPlaceBlock.unsubscribe(afterPlaceSub);

    if (intervalHandle !== null) system.clearRun(intervalHandle);

    beforeSub = afterSub = breakSub = afterBreakSub = afterPlaceSub = null;
    intervalHandle = null;
}

/** ------------------- EXPORTS ------------------- */
export { startChestLock, stopChestLock };
