import {
    Block,
    Dimension,
    Player,
    PlayerBreakBlockAfterEvent,
    PlayerBreakBlockBeforeEvent,
    PlayerInteractWithBlockAfterEvent,
    PlayerInteractWithBlockBeforeEvent,
    PlayerPlaceBlockAfterEvent,
    PlayerPlaceBlockBeforeEvent,
    system,
} from "@minecraft/server";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { chestLockDB } from "../event-listeners/world-initialize";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";

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
    return SecurityClearanceManager.getSecurityClearanceLevel4Players().has(player);
}

/**
 * Sends a message to all players with level 4 clearance.
 *
 * @param {string} message - The message to send.
 */
function notifyLevel4Players(message: string): void {
    SecurityClearanceManager.getSecurityClearanceLevel4Players().forEach((p) => p.sendMessage(message));
}

/** ------------------- CHEST DATABASE HELPERS ------------------- */

/**
 * Retrieves information about a locked chest.
 *
 * @param {Block} block - The chest block to query.
 * @returns {Object|null} An object containing chest info, or `null` if the chest is not locked.
 * @property {string} [owner] - The player who owns the chest.
 * @property {string} [placedBy] - The player who placed the chest.
 * @property {number} [lastAccessed] - Timestamp of the last access.
 * @property {{ player: string; time: number }[]} [accessLog] - Array of past access events.
 * @property {string[]} [sharedWith] - Players allowed to access this chest in addition to the owner.
 */
async function getChestInfo(block: Block): Promise<{
    owner?: string;
    placedBy?: string;
    lastAccessed?: number;
    accessLog?: { player: string; time: number }[];
    sharedWith?: string[];
} | null> {
    const key = getCanonicalChestKey(block);
    return (await chestLockDB.get(key)) ?? null;
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
    const entry = (await chestLockDB.get(key)) ?? null;

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
async function pruneOldLogs(retentionDays: number = 30): Promise<void> {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    for (const [key, value] of await chestLockDB.entries()) {
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

    const chestInfo = await getChestInfo(block);
    const owner = chestInfo?.owner;
    const sharedWith = chestInfo?.sharedWith ?? [];
    if (!owner) return;

    const isOwner = player.name === owner;
    const hasOverride = hasLevel4Clearance(player);
    const validated = sharedWith.includes(player.name);

    // OWNER or SHARED (with or without level 4 access) → silent but logged
    if (isOwner || hasOverride || validated) {
        await logChestAccess(block, player.name);
        return;
    }

    // UNAUTHORIZED ACCESS → blocked + logged + notified
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
    const entry = await chestLockDB.get(key);
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
        return;
    }

    if (owner === player.name || hasLevel4Clearance(player)) {
        await chestLockDB.delete(key);

        player.sendMessage(`§2[§7Paradox§2]§o§7 You have unlocked this chest.`);

        const transform = PlayerLocationCache.getTransform(player);
        const loc = transform?.location ?? block.location;
        player.playSound("open.iron_door", { location: loc });
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

    const chestInfo = await getChestInfo(block);
    const owner = chestInfo?.owner;
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
    const { block, brokenBlockPermutation } = event;

    const typeId = brokenBlockPermutation.type.id;

    if (!STORAGE_BLOCKS.has(typeId) && !/^minecraft:.*_shulker_box$/.test(typeId)) {
        return;
    }

    // recreate minimal Block-like object
    const virtualBlock = {
        typeId: typeId,
        location: block.location,
        dimension: block.dimension,
        x: block.x,
        y: block.y,
        z: block.z,
    } as Block;

    const key = getCanonicalChestKey(virtualBlock);

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
    const existing = await chestLockDB.get(key);

    // Don't overwrite if already tracked (important for double chests / reloads)
    if (!existing) {
        await chestLockDB.set(key, {
            placedBy: player.name,
            lastAccessed: Date.now(),
            accessLog: [],
        });
    }
}

async function hopperPlaceBefore(event: PlayerPlaceBlockBeforeEvent): Promise<void> {
    const { block, player, permutationToPlace } = event;

    const placingId = permutationToPlace?.type?.id;

    if (placingId !== "minecraft:hopper") {
        return;
    }

    const transform = PlayerLocationCache.getTransform(player);
    const targetDimension = transform?.dimension ?? player.dimension;

    const containerBlock = targetDimension.getBlock({
        x: block.x,
        y: block.y + 1,
        z: block.z,
    });

    if (!containerBlock) {
        return;
    }

    const chestInfo = await getChestInfo(containerBlock);

    const hasAccess = chestInfo?.owner === player.name || hasLevel4Clearance(player);

    if (!hasAccess) {
        event.cancel = true;

        player.sendMessage(`§2[§7Paradox§2]§o§7 You cannot place a hopper below this chest as you do not own it.`);
        notifyLevel4Players(`§2[§7Paradox§2]§o§7 §4[LOG]§7 ${player.name} tried to place a hopper below locked chest by ${chestInfo?.owner} at ${getCanonicalChestKey(containerBlock)}`);
        await logChestAccess(containerBlock, player.name);
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
let hopperBeforePlaceSub: ((event: PlayerPlaceBlockBeforeEvent) => void) | null = null;
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
    hopperBeforePlaceSub = (event) => hopperPlaceBefore(event);
    // Subscribe to relevant events for chest locking functionality
    EventCoordinator.subscribeBefore("playerInteractWithBlock", beforeSub);
    EventCoordinator.subscribeAfter("playerInteractWithBlock", afterSub);
    EventCoordinator.subscribeBefore("playerBreakBlock", breakSub);
    EventCoordinator.subscribeAfter("playerBreakBlock", afterBreakSub);
    EventCoordinator.subscribeAfter("playerPlaceBlock", afterPlaceSub);
    EventCoordinator.subscribeBefore("playerPlaceBlock", hopperBeforePlaceSub);

    intervalHandle = system.runInterval(() => pruneOldLogs(30), 72000);
}

/**
 * Stops the chest lock system and unsubscribes all listeners.
 */
function stopChestLock() {
    if (beforeSub) EventCoordinator.unsubscribeBefore("playerInteractWithBlock", beforeSub);
    if (afterSub) EventCoordinator.unsubscribeAfter("playerInteractWithBlock", afterSub);
    if (breakSub) EventCoordinator.unsubscribeBefore("playerBreakBlock", breakSub);
    if (afterBreakSub) EventCoordinator.unsubscribeAfter("playerBreakBlock", afterBreakSub);
    if (afterPlaceSub) EventCoordinator.unsubscribeAfter("playerPlaceBlock", afterPlaceSub);
    if (hopperBeforePlaceSub) EventCoordinator.unsubscribeBefore("playerPlaceBlock", hopperBeforePlaceSub);

    if (intervalHandle !== null) system.clearRun(intervalHandle);

    beforeSub = afterSub = breakSub = afterBreakSub = afterPlaceSub = null;
    intervalHandle = null;
}

/** ------------------- EXPORTS ------------------- */
export { startChestLock, stopChestLock };
