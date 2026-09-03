import {
    system,
    Player,
    PlayerJoinAfterEvent,
    PlayerLeaveBeforeEvent,
    PlayerDimensionChangeAfterEvent,
    PlayerSpawnAfterEvent,
    PlayerInventoryItemChangeAfterEvent,
    EntityDieAfterEvent,
    PlayerBreakBlockBeforeEvent,
    EntityItemPickupAfterEvent,
    ItemStack,
    Container,
} from "@minecraft/server";
import { invSyncAuditDB } from "../event-listeners/world-initialize";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { PlayerCache } from "../classes/cache/player-cache";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { FlagManager } from "../classes/logging/flag-manager";

/** Maximum number of audit entries retained per player. */
const MAX_AUDIT_EVENTS = 200;

/** Rapid rejoin time window in milliseconds (15 seconds). */
const REJOIN_WINDOW_MS = 15000;

/** Toggle for visual console debugging outputs. */
const DEBUG_MODE = false;

/** Temporary disconnect snapshot structure for rapid rejoin delta checks. */
interface DisconnectSnapshot {
    time: number;
    counts: Record<string, number>;
    containerHashes: Set<string>;
}

/** RUNTIME STATE & CACHES */
let isModuleActive = false;

/** Player UUID set for tracking active dimension transitions. */
const dimensionChangingPlayers = new Set<string>();

/** Player UUID set for tracking dead players awaiting respawn. */
const deadPlayers = new Set<string>();

/** Processing lock set preventing race conditions during mutation checks. */
const processingLock = new Set<string>();

/** Global lookup map mapping shulker unique IDs to hashed contents ($O(1)$ lookup). */
const shulkerHashRegistry = new Map<string, string>();

/** Queue tracking recently broken shulker hash signatures for drop mapping ($O(1)$ lookup). */
const pendingShulkerHashes: string[] = [];

/** In-memory cache tracking short-window disconnect snapshots for rapid rejoin checks ($O(1)$ lookup). */
const disconnectSnapshots = new Map<string, DisconnectSnapshot>();

// Cached Subscriber References
let joinSub: ((arg: PlayerJoinAfterEvent) => void) | undefined;
let leaveSub: ((arg: PlayerLeaveBeforeEvent) => void) | undefined;
let dimensionSub: ((arg: PlayerDimensionChangeAfterEvent) => void) | undefined;
let spawnSub: ((arg: PlayerSpawnAfterEvent) => void) | undefined;
let dieSub: ((arg: EntityDieAfterEvent) => void) | undefined;
let itemChangeSub: ((arg: PlayerInventoryItemChangeAfterEvent) => void) | undefined;
let blockBreakSub: ((arg: PlayerBreakBlockBeforeEvent) => void) | undefined;
let pickupSub: ((arg: EntityItemPickupAfterEvent) => void) | undefined;

/**
 * Dispatches debug log messages if debug mode is active.
 * @param {string} tag - Subsystem category label.
 * @param {string} message - Payload detail message.
 */
function logDebug(tag: string, message: string): void {
    if (DEBUG_MODE) {
        console.warn(`[InvSync DEBUG][${tag}] ${message}`);
    }
}

/**
 * Converts a raw string payload into an 8-character hexadecimal string digest.
 * @param {string} input - Raw serialized payload string.
 * @returns {string} Pseudo-random alphanumeric hash string.
 */
function hashString(input: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;

    for (let i = 0; i < input.length; i++) {
        const ch = input.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    const hashNum = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return hashNum.toString(36);
}

/**
 * Attaches a unique shulker ID dynamic property to an item stack.
 * @param {ItemStack} item - Target shulker box item stack.
 * @param {string} shulkerId - Unique shulker identifier.
 */
function stampShulkerItem(item: ItemStack, shulkerId: string): void {
    try {
        item.setDynamicProperty("shulker_id", shulkerId);
        logDebug("ShulkerStamp", `Successfully set dynamic property 'shulker_id' -> ${shulkerId}`);
    } catch (e) {
        logDebug("ShulkerStamp", `Failed setting dynamic property: ${e}`);
    }
}

/**
 * Scans container items (Bundles via inner container, Shulker Boxes via dynamic property lookup).
 * @param {ItemStack} containerItem - Target bundle or shulker ItemStack.
 * @returns {string | null} Hash digest reflecting contents, or null if empty/untracked.
 */
function getContainerPayloadHash(containerItem: ItemStack): string | null {
    const container = containerItem.getComponent("inventory")?.container;
    if (container) {
        const contents: string[] = [];
        const size = container.size;
        for (let i = 0; i < size; i++) {
            const subItem = container.getItem(i);
            if (subItem) {
                const subLore = subItem.getLore().join("|");
                const subName = subItem.nameTag ?? "";
                contents.push(`${i}:${subItem.typeId}:${subItem.amount}:${subName}:${subLore}`);
            }
        }

        const loreData = containerItem.getLore().join("|");
        const nameTag = containerItem.nameTag ?? "";

        if (contents.length === 0 && !nameTag && loreData.length === 0) {
            return null;
        }

        return hashString(`${containerItem.typeId}:${nameTag}:${loreData}|[${contents.join(";")}]`);
    }

    if (containerItem.typeId.includes("shulker_box")) {
        const shulkerId = containerItem.getDynamicProperty("shulker_id") as string | undefined;

        if (shulkerId && shulkerHashRegistry.has(shulkerId)) {
            const registeredHash = shulkerHashRegistry.get(shulkerId)!;
            logDebug("ShulkerItem", `Matched hash for Shulker ID ${shulkerId}: ${registeredHash}`);
            return registeredHash;
        }
    }

    return null;
}

/**
 * Evaluates whether an item qualifies as a tracked container (Bundles or Shulkers).
 * @param {string} typeId - Namespace ID of the item.
 * @returns {boolean} True if the item is a bundle or shulker box variant.
 */
function isTrackedContainer(typeId: string): boolean {
    return typeId.endsWith("_bundle") || typeId === "minecraft:bundle" || typeId.includes("shulker_box");
}

/**
 * Evaluates an individual inventory slot, accumulating counts and generating hashes for non-empty containers.
 * @param {ItemStack} item - ItemStack at the current slot.
 * @param {number} slotIndex - Current slot index in container.
 * @param {Container} container - Inventory container reference for write-backs.
 * @param {Record<string, number>} counts - Aggregated count accumulator object.
 * @param {string[]} containerHashes - List of container hash signatures.
 */
function processSlotItem(item: ItemStack, slotIndex: number, container: Container, counts: Record<string, number>, containerHashes: string[]): void {
    counts[item.typeId] = (counts[item.typeId] ?? 0) + item.amount;

    if (isTrackedContainer(item.typeId)) {
        if (item.typeId.includes("shulker_box") && !item.getDynamicProperty("shulker_id") && pendingShulkerHashes.length > 0) {
            const contentHash = pendingShulkerHashes.shift()!;
            const shulkerId = `shulker_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            shulkerHashRegistry.set(shulkerId, contentHash);
            stampShulkerItem(item, shulkerId);
            container.setItem(slotIndex, item);
        }

        const hash = getContainerPayloadHash(item);
        if (hash !== null) {
            containerHashes.push(hash);
            logDebug("ProcessSlot", `Accumulated container hash: ${hash}`);
        } else {
            logDebug("ProcessSlot", `Container ${item.typeId} yielded null hash.`);
        }
    }
}

/**
 * Aggregates current inventory item totals and generates container payload hashes.
 * @param {Player} player - Target player entity to inspect.
 * @returns {{ counts: Record<string, number>; containerHashes: string[] } | null} Inventory summary object.
 */
export function getInventoryState(player: Player): { counts: Record<string, number>; containerHashes: string[] } | null {
    if (!player?.isValid) return null;
    const container = player.getComponent("inventory")?.container;
    if (!container) return null;

    const counts: Record<string, number> = {};
    const containerHashes: string[] = [];
    const size = container.size;

    for (let i = 0; i < size; i++) {
        const item = container.getItem(i);
        if (item) {
            processSlotItem(item, i, container, counts, containerHashes);
        }
    }

    logDebug("GetState", `Player ${player.name} state scanned. Hashes total: ${containerHashes.length} [${containerHashes.join(", ")}]`);
    return { counts, containerHashes };
}

/**
 * Checks if container hash array contains duplicate entries ($O(N)$ with Set lookup).
 * @param {string[]} containerHashes - Hash signatures list.
 * @returns {string | undefined} Duplicate signature string if found, otherwise undefined.
 */
function findDuplicateHash(containerHashes: string[]): string | undefined {
    const hashSet = new Set<string>();
    for (const hash of containerHashes) {
        if (hashSet.has(hash)) return hash;
        hashSet.add(hash);
    }
    return undefined;
}

/**
 * Intercepts shulker box breaking *before* block destruction to capture contents and stage tracking metadata.
 * @param {PlayerBreakBlockBeforeEvent} event - Player break block before event context.
 */
function onPlayerBreakBlockBefore(event: PlayerBreakBlockBeforeEvent): void {
    const { block } = event;
    if (!block.typeId.includes("shulker_box")) return;

    const container = block.getComponent("inventory")?.container;
    if (!container) return;

    const contents: string[] = [];
    const size = container.size;

    for (let i = 0; i < size; i++) {
        const item = container.getItem(i);
        if (item) {
            contents.push(`${i}:${item.typeId}:${item.amount}:${item.nameTag ?? ""}`);
        }
    }

    if (contents.length === 0) return;

    const contentHash = hashString(`${block.typeId}|[${contents.join(";")}]`);
    pendingShulkerHashes.push(contentHash);

    logDebug("BlockBreak", `Staged broken Shulker Hash [${contentHash}] in pending drop queue. Queue size: ${pendingShulkerHashes.length}`);
}

/**
 * Handles item pickup events safely.
 * @param {EntityItemPickupAfterEvent} event - Entity item pickup after event context.
 */
function onEntityItemPickup(event: EntityItemPickupAfterEvent): void {
    if (event.entity instanceof Player && event.entity.isValid) {
        const items = event.items;
        if (items.length === 0) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item?.typeId?.includes("shulker_box")) {
                logDebug("ItemPickup", `Player ${event.entity.name} picked up Shulker Box.`);
            }
        }
    }
}

/**
 * Evaluates item mutations using Container Inner-Content Hash Validation.
 * @param {PlayerInventoryItemChangeAfterEvent} event - Inventory item change event context.
 * @returns {Promise<void>}
 */
async function onInventoryItemChanged(event: PlayerInventoryItemChangeAfterEvent): Promise<void> {
    const player = event.player;
    if (!player?.isValid) return;

    const playerId = player.id;
    if (dimensionChangingPlayers.has(playerId) || deadPlayers.has(playerId) || processingLock.has(playerId)) {
        return;
    }

    const typeId = event.itemStack?.typeId ?? event.beforeItemStack?.typeId;
    if (!typeId) return;

    processingLock.add(playerId);

    try {
        const state = getInventoryState(player);
        if (!state) return;

        const duplicateHash = findDuplicateHash(state.containerHashes);
        if (duplicateHash) {
            logDebug("InventoryChange", `ANOMALY DETECTED! Player ${player.name} has duplicate container hash: ${duplicateHash}`);
            await handleAnomaly(player, typeId, 1);
        }
    } finally {
        processingLock.delete(playerId);
    }
}

/**
 * Deducts granular inventory excess detected between disconnect and rejoin without wiping legitimate items.
 * @param {Container} container - Player's inventory container.
 * @param {Record<string, number>} excessMap - Map of itemId -> amount to deduct.
 * @param {Set<string>} excessContainerHashes - Set of illegitimate container payload hashes.
 */
function remediateDisconnectDelta(container: Container, excessMap: Record<string, number>, excessContainerHashes: Set<string>): void {
    const size = container.size;

    for (let i = 0; i < size; i++) {
        const item = container.getItem(i);
        if (!item) continue;

        if (isTrackedContainer(item.typeId)) {
            const hash = getContainerPayloadHash(item);
            if (hash && excessContainerHashes.has(hash)) {
                container.setItem(i, undefined);
                logDebug("DeltaRemediate", `Removed unauthorized container [${item.typeId}] from slot ${i}`);
                continue;
            }
        }

        const excess = excessMap[item.typeId];
        if (excess && excess > 0) {
            if (item.amount <= excess) {
                excessMap[item.typeId] = (excessMap[item.typeId] ?? 0) - item.amount;
                container.setItem(i, undefined);
                logDebug("DeltaRemediate", `Cleared entire slot ${i} for ${item.typeId}`);
            } else {
                item.amount -= excess;
                excessMap[item.typeId] = 0;
                container.setItem(i, item);
                logDebug("DeltaRemediate", `Deducted excess from slot ${i} for ${item.typeId}`);
            }
        }
    }
}

/**
 * Compares post-rejoin inventory state against disconnect baseline and remediates illegitimate items.
 * @param {Player} player - Rejoining player entity.
 * @param {DisconnectSnapshot} snapshot - Captured disconnect state baseline.
 * @returns {Promise<void>}
 */
async function processRejoinDelta(player: Player, snapshot: DisconnectSnapshot): Promise<void> {
    const container = player.getComponent("inventory")?.container;
    if (!container) return;

    const currentState = getInventoryState(player);
    if (!currentState) return;

    const excessMap: Record<string, number> = {};
    let totalExcessItems = 0;

    for (const [typeId, currentAmount] of Object.entries(currentState.counts)) {
        const previousAmount = snapshot.counts[typeId] ?? 0;
        if (currentAmount > previousAmount) {
            const diff = currentAmount - previousAmount;
            excessMap[typeId] = diff;
            totalExcessItems += diff;
        }
    }

    const excessContainerHashes = new Set<string>();
    for (const hash of currentState.containerHashes) {
        if (!snapshot.containerHashes.has(hash)) {
            excessContainerHashes.add(hash);
        }
    }

    if (totalExcessItems > 0 || excessContainerHashes.size > 0) {
        remediateDisconnectDelta(container, excessMap, excessContainerHashes);

        const summaryParts: string[] = [];
        if (totalExcessItems > 0) summaryParts.push(`${totalExcessItems}x loose items`);
        if (excessContainerHashes.size > 0) summaryParts.push(`${excessContainerHashes.size}x containers`);
        const summary = summaryParts.join(", ");

        player.sendMessage(`§2[§7Paradox§2] §o§cANOMALY: §7Rejoin delta check removed unauthorized items: §e${summary}§7.`);
        await recordAuditLog(player.id, "DisconnectDeltaMismatch", totalExcessItems + excessContainerHashes.size);
        alertStaff(player, `Rejoin delta mismatch corrected (${summary} removed)`);
    }
}

/**
 * Executes slot-by-slot inventory deductions for flagged items.
 * @param {Container} container - Inventory container reference.
 * @param {string} typeId - Target item type ID.
 * @param {number} excessAmount - Target total deduction count.
 * @returns {number} Remaining excess amount that could not be deducted.
 */
function deductInventoryItems(container: Container, typeId: string, excessAmount: number): number {
    let remainingToDeduct = excessAmount;
    const size = container.size;

    for (let i = 0; i < size && remainingToDeduct > 0; i++) {
        const item = container.getItem(i);
        if (!item || item.typeId !== typeId) continue;

        if (item.amount <= remainingToDeduct) {
            remainingToDeduct -= item.amount;
            container.setItem(i, undefined);
        } else {
            item.amount -= remainingToDeduct;
            container.setItem(i, item);
            remainingToDeduct = 0;
        }
    }
    return remainingToDeduct;
}

/**
 * Appends audit logging record for an anomaly event.
 * @param {string} playerId - Target player UUID.
 * @param {string} typeId - Flagged item type ID.
 * @param {number} actualDeducted - Amount removed from player.
 * @returns {Promise<void>}
 */
async function recordAuditLog(playerId: string, typeId: string, actualDeducted: number): Promise<void> {
    try {
        const audit = (await invSyncAuditDB.get(playerId)) ?? { events: [] };
        audit.events.push({
            time: Date.now(),
            excessItems: { [typeId]: actualDeducted },
            totalExcess: actualDeducted,
        });

        if (audit.events.length > MAX_AUDIT_EVENTS) {
            audit.events = audit.events.slice(-MAX_AUDIT_EVENTS);
        }
        await invSyncAuditDB.set(playerId, audit);
    } catch (e) {
        console.error(`[Paradox] Audit Log Save Error [${playerId}]: ${e}`);
    }
}

/**
 * Deducts flagged duplicate items and updates security logs.
 * @param {Player} player - Offending player entity.
 * @param {string} typeId - Type ID of offending item.
 * @param {number} excessAmount - Quantity to remove.
 * @returns {Promise<void>}
 */
async function handleAnomaly(player: Player, typeId: string, excessAmount: number): Promise<void> {
    player.sendMessage(`§2[§7Paradox§2] §o§cANOMALY: §7Detected §f${excessAmount}x §e${typeId}§7.`);

    const container = player.getComponent("inventory")?.container;
    if (!container) return;

    const remainingToDeduct = deductInventoryItems(container, typeId, excessAmount);
    const actualDeducted = excessAmount - remainingToDeduct;

    await recordAuditLog(player.id, typeId, actualDeducted);
    alertStaff(player, `${typeId} (x${actualDeducted} removed)`);
}

/** LIFECYCLE HOOKS */

function onPlayerJoin(event: PlayerJoinAfterEvent): void {
    const playerId = event.playerId;

    system.runTimeout(async () => {
        const player = PlayerCache.getPlayerById(playerId);
        if (!player?.isValid) return;

        const snapshot = disconnectSnapshots.get(playerId);
        if (snapshot) {
            disconnectSnapshots.delete(playerId);
            const elapsed = Date.now() - snapshot.time;

            if (elapsed <= REJOIN_WINDOW_MS) {
                logDebug("RejoinCheck", `Player ${player.name} rejoined in ${elapsed}ms. Evaluating delta...`);
                await processRejoinDelta(player, snapshot);
            }
        }
    }, 10);
}

function onPlayerLeave(event: PlayerLeaveBeforeEvent): void {
    const player = event.player;
    if (!player) return;

    const state = getInventoryState(player);
    if (state) {
        const snapshot: DisconnectSnapshot = {
            time: Date.now(),
            counts: state.counts,
            containerHashes: new Set(state.containerHashes),
        };
        disconnectSnapshots.set(player.id, snapshot);

        system.runTimeout(
            () => {
                disconnectSnapshots.delete(player.id);
            },
            Math.ceil(REJOIN_WINDOW_MS / 50)
        );
    }

    dimensionChangingPlayers.delete(player.id);
    deadPlayers.delete(player.id);
    processingLock.delete(player.id);
}

function onDimensionChange(event: PlayerDimensionChangeAfterEvent): void {
    const player = event.player;
    if (!player?.isValid) return;

    dimensionChangingPlayers.add(player.id);
    system.runTimeout(() => {
        dimensionChangingPlayers.delete(player.id);
    }, 40);
}

function onPlayerDie(event: EntityDieAfterEvent): void {
    const entity = event.deadEntity;
    if (entity instanceof Player) {
        deadPlayers.add(entity.id);
    }
}

function onPlayerSpawn(event: PlayerSpawnAfterEvent): void {
    const player = event.player;
    if (!player?.isValid) return;

    system.runTimeout(() => {
        deadPlayers.delete(player.id);
    }, 40);
}

/** NOTIFICATION SYSTEM */

function alertStaff(player: Player, summaryMessage: string): void {
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    FlagManager.logFlag(player, "InvSync", `Inventory anomaly corrected: ${summaryMessage}`);
    for (const s of staff) {
        if (s?.isValid && s.id !== player.id) {
            s.sendMessage(`§2[§7Paradox§2]§o§7 §e[InvSync] §f${player.name} §7flagged: §c${summaryMessage}`);
        }
    }
}

function alertStaffSystem(message: string): void {
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s?.isValid) s.sendMessage(`§2[§7Paradox§2]§o§7 ${message}`);
    }
}

/** MODULE CONTROLLERS */

export async function startInvSync(): Promise<void> {
    if (isModuleActive) return;
    isModuleActive = true;

    joinSub = onPlayerJoin;
    leaveSub = onPlayerLeave;
    dimensionSub = onDimensionChange;
    dieSub = onPlayerDie;
    spawnSub = onPlayerSpawn;
    itemChangeSub = onInventoryItemChanged;
    blockBreakSub = onPlayerBreakBlockBefore;
    pickupSub = onEntityItemPickup;

    EventCoordinator.subscribeAfter("playerJoin", joinSub);
    EventCoordinator.subscribeBefore("playerLeave", leaveSub);
    EventCoordinator.subscribeAfter("playerDimensionChange", dimensionSub);
    EventCoordinator.subscribeAfter("entityDie", dieSub);
    EventCoordinator.subscribeAfter("playerSpawn", spawnSub);
    EventCoordinator.subscribeAfter("playerInventoryItemChange", itemChangeSub);
    EventCoordinator.subscribeBefore("playerBreakBlock", blockBreakSub);
    EventCoordinator.subscribeAfter("entityItemPickup", pickupSub);

    alertStaffSystem("§7InvSync framework §astarted§7.");
}

export function stopInvSync(): void {
    if (!isModuleActive) return;
    isModuleActive = false;

    if (joinSub) EventCoordinator.unsubscribeAfter("playerJoin", joinSub);
    if (leaveSub) EventCoordinator.unsubscribeBefore("playerLeave", leaveSub);
    if (dimensionSub) EventCoordinator.unsubscribeAfter("playerDimensionChange", dimensionSub);
    if (dieSub) EventCoordinator.unsubscribeAfter("entityDie", dieSub);
    if (spawnSub) EventCoordinator.unsubscribeAfter("playerSpawn", spawnSub);
    if (itemChangeSub) EventCoordinator.unsubscribeAfter("playerInventoryItemChange", itemChangeSub);
    if (blockBreakSub) EventCoordinator.unsubscribeBefore("playerBreakBlock", blockBreakSub);
    if (pickupSub) EventCoordinator.unsubscribeAfter("entityItemPickup", pickupSub);

    joinSub = leaveSub = dimensionSub = dieSub = spawnSub = itemChangeSub = blockBreakSub = pickupSub = undefined;

    disconnectSnapshots.clear();
    dimensionChangingPlayers.clear();
    deadPlayers.clear();
    processingLock.clear();
    shulkerHashRegistry.clear();
    pendingShulkerHashes.length = 0;

    alertStaffSystem("§7InvSync framework §4stopped§7.");
}

export async function forceCheckAll(): Promise<void> {
    for (const player of PlayerCache.getPlayers()) {
        if (!player?.isValid || dimensionChangingPlayers.has(player.id) || deadPlayers.has(player.id)) continue;

        try {
            const state = getInventoryState(player);
            if (!state) continue;

            const duplicateHash = findDuplicateHash(state.containerHashes);
            if (duplicateHash) {
                await handleAnomaly(player, "Duplicated Payload Container", 1);
            }
        } catch (e) {
            console.error(`[Paradox] Manual Scan Failure [${player.name}]: ${e}`);
        }
    }
}

export async function clearAllAuditLogs(): Promise<void> {
    try {
        await invSyncAuditDB.clear();
    } catch (e) {
        console.error(`[Paradox] DB Clear Error: ${e}`);
    }

    disconnectSnapshots.clear();
    dimensionChangingPlayers.clear();
    deadPlayers.clear();
    processingLock.clear();
    shulkerHashRegistry.clear();
    pendingShulkerHashes.length = 0;

    alertStaffSystem("§2[§7Paradox§2]§o§7 Inventory audit logs cleared.");
}
