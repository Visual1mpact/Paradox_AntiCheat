import {
    system,
    world,
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
import { invSyncSnapshotsDB, invSyncAuditDB } from "../event-listeners/world-initialize";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { PlayerCache } from "../classes/cache/player-cache";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { FlagManager } from "../classes/logging/flag-manager";
import { InvSyncSnapshotRecord } from "../classes/database/db-types";

/**
 * CONFIGURATION CONSTANTS
 */

/** Maximum number of audit entries retained per player. */
const MAX_AUDIT_EVENTS = 200;

/** Tick delay used to buffer state updates across world lifecycle transitions. */
const BUFFER_TICKS = 40;

/** Time-to-live threshold for offline player snapshots (7 days in ms). */
const SNAPSHOT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Frequency in ticks at which database cleanup runs (~5 minutes). */
const CLEANUP_INTERVAL_TICKS = 6000;

/**
 * TYPE DEFINITIONS
 */

/**
 * Extended snapshot structure including runtime hash collections.
 */
interface InvSyncSnapshot extends InvSyncSnapshotRecord {
    /** Hash array for container and unique items. */
    containerHashes: string[];
}

/**
 * RUNTIME STATE & CACHES
 */

/** Flag indicating whether the InvSync system is actively running. */
let isModuleActive = false;

/** Scheduled interval ID for database cleanup vacuum execution. */
let cleanupIntervalId: number | undefined;

/** Scheduled interval ID for async database flush operations. */
let dbFlushIntervalId: number | undefined;

/** Player UUID set for tracking active dimension transitions. */
const dimensionChangingPlayers = new Set<string>();

/** Player UUID set for tracking dead players awaiting respawn. */
const deadPlayers = new Set<string>();

/** Processing lock set preventing race conditions during mutation checks. */
const processingLock = new Set<string>();

/** Set tracking player UUIDs with pending unwritten database updates. */
const dirtySnapshots = new Set<string>();

/** In-memory cache holding current player inventory snapshots ($O(1)$ lookup). */
const snapshotCache = new Map<string, InvSyncSnapshot>();

/** In-memory cache tracking last interaction epoch time per player. */
const playerInteractionWindow = new Map<string, number>();

/** Global lookup map mapping shulker unique IDs to hashed contents ($O(1)$ lookup). */
const shulkerHashRegistry = new Map<string, string>();

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
 * Converts a raw string payload into an 8-character hexadecimal string digest.
 *
 * @param input - Raw serialized payload string.
 * @returns Pseudo-random alphanumeric hash string (e.g., "a1b2c3d4").
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
 * Scans container items (Bundles via inner container, Shulker Boxes via dynamic lifecycle lookup).
 *
 * @param containerItem - Target bundle or shulker ItemStack.
 * @returns Hash digest reflecting contents, or null if empty/untracked.
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
            return shulkerHashRegistry.get(shulkerId)!;
        }
    }

    return null;
}

/**
 * Evaluates whether an item qualifies as a tracked container (Bundles or Shulkers).
 *
 * @param typeId - Namespace ID of the item.
 * @returns True if the item is a bundle or shulker box variant.
 */
function isTrackedContainer(typeId: string): boolean {
    return typeId.endsWith("_bundle") || typeId === "minecraft:bundle" || typeId.includes("shulker_box");
}

/**
 * Evaluates an individual inventory slot, accumulating counts and generating hashes for non-empty containers.
 *
 * @param item - ItemStack at the current slot.
 * @param counts - Aggregated count accumulator object.
 * @param containerHashes - List of container hash signatures.
 */
function processSlotItem(item: ItemStack, counts: Record<string, number>, containerHashes: string[]): void {
    counts[item.typeId] = (counts[item.typeId] ?? 0) + item.amount;

    if (isTrackedContainer(item.typeId)) {
        const hash = getContainerPayloadHash(item);
        if (hash !== null) {
            containerHashes.push(hash);
        }
    }
}

/**
 * Aggregates current inventory item totals and generates container payload hashes.
 *
 * @param player - Target player entity to inspect.
 * @returns Inventory summary object, or `null` if container is unavailable.
 */
function getInventoryState(player: Player): { counts: Record<string, number>; containerHashes: string[] } | null {
    if (!player?.isValid) return null;
    const container = player.getComponent("inventory")?.container;
    if (!container) return null;

    const counts: Record<string, number> = {};
    const containerHashes: string[] = [];
    const size = container.size;

    for (let i = 0; i < size; i++) {
        const item = container.getItem(i);
        if (item) {
            processSlotItem(item, counts, containerHashes);
        }
    }
    return { counts, containerHashes };
}

/**
 * Synchronous local cache update; queues DB write for background batching.
 *
 * @param playerId - Target player UUID.
 * @param snapshot - Updated snapshot payload to persist.
 */
function updateMemorySnapshot(playerId: string, snapshot: InvSyncSnapshot): void {
    snapshotCache.set(playerId, snapshot);
    dirtySnapshots.add(playerId);
}

/**
 * Flushes dirty in-memory snapshots to disk in the background to prevent watchdog spikes.
 *
 * @returns Promise resolving when all queued entries are written.
 */
async function flushDirtySnapshots(): Promise<void> {
    if (dirtySnapshots.size === 0) return;

    for (const playerId of Array.from(dirtySnapshots)) {
        dirtySnapshots.delete(playerId);
        const snapshot = snapshotCache.get(playerId);
        if (!snapshot) continue;

        try {
            await invSyncSnapshotsDB.set(playerId, snapshot);
        } catch (e) {
            console.error(`[Paradox] DB Batch Write Error: ${e}`);
        }
    }
}

/**
 * Upgrades legacy database records missing containerHashes upfront.
 *
 * @returns Promise resolving when schema migration finishes.
 */
async function migrateLegacySnapshots(): Promise<void> {
    try {
        await invSyncSnapshotsDB.clean(
            (_: string, record: InvSyncSnapshotRecord) => {
                const snapshot = record as InvSyncSnapshot;
                if (!Array.isArray(snapshot.containerHashes)) {
                    snapshot.containerHashes = [];
                }
                return true;
            },
            { silent: true }
        );
    } catch (e) {
        console.error(`[Paradox] Failed to execute DB schema migration: ${e}`);
    }
}

/**
 * Call this when a player performs valid item actions (crafting, opening containers, picking up items).
 *
 * @param playerId - Target player UUID.
 */
export function recordPlayerInteraction(playerId: string): void {
    playerInteractionWindow.set(playerId, Date.now());
}

/**
 * Periodic database vacuum operation for offline players.
 *
 * @returns Promise resolving when database vacuum completes.
 */
async function runDatabaseVacuum(): Promise<void> {
    try {
        await invSyncSnapshotsDB.clean((_: string, value: InvSyncSnapshotRecord) => Date.now() - value.time < SNAPSHOT_EXPIRY_MS, { silent: true });
    } catch (e) {
        console.error(`[Paradox] Vacuum Error: ${e}`);
    }
}

/**
 * Fetches or instantiates a snapshot baseline for a given player ($O(1)$ lookup).
 *
 * @param player - Target player entity.
 * @returns Promise resolving to active inventory snapshot.
 */
async function resolvePlayerSnapshot(player: Player): Promise<InvSyncSnapshot> {
    const cached = snapshotCache.get(player.id);
    if (cached) return cached;

    const dbRecord = (await invSyncSnapshotsDB.get(player.id)) as InvSyncSnapshot | undefined;
    const snapshot: InvSyncSnapshot = {
        counts: dbRecord?.counts ?? {},
        containerHashes: dbRecord?.containerHashes ?? [],
        time: dbRecord?.time ?? Date.now(),
        name: dbRecord?.name ?? player.name,
    };
    snapshotCache.set(player.id, snapshot);
    return snapshot;
}

/**
 * Checks if container hash array contains duplicate entries ($O(N)$ with Set lookup).
 *
 * @param containerHashes - Hash signatures list.
 * @returns Duplicate signature string if found, otherwise undefined.
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
 * Intercepts shulker box breaking *before* block destruction to capture contents and attach tracking metadata.
 *
 * @param event - Player break block before event context.
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

    const shulkerId = `shulker_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const contentHash = hashString(`${block.typeId}|[${contents.join(";")}]`);

    shulkerHashRegistry.set(shulkerId, contentHash);
}

/**
 * CORE ANOMALY DETECTION ENGINE
 * Evaluates item mutations using Container Inner-Content Hash Validation.
 *
 * @param event - Inventory item change event context.
 * @returns Promise resolving upon analysis completion.
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
        await resolvePlayerSnapshot(player);
        const state = getInventoryState(player);
        if (!state) return;

        const duplicateHash = findDuplicateHash(state.containerHashes);
        if (duplicateHash) {
            await handleAnomaly(player, typeId, 1);
            return;
        }

        updateMemorySnapshot(playerId, {
            counts: state.counts,
            containerHashes: state.containerHashes,
            time: Date.now(),
            name: player.name,
        });
    } finally {
        processingLock.delete(playerId);
    }
}

/**
 * Executes slot-by-slot inventory deductions for flagged items.
 *
 * @param container - Inventory container reference.
 * @param typeId - Target item type ID.
 * @param excessAmount - Target total deduction count.
 * @returns Remaining excess amount that could not be deducted.
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
 *
 * @param playerId - Target player UUID.
 * @param typeId - Flagged item type ID.
 * @param actualDeducted - Amount removed from player.
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
 *
 * @param player - Offending player entity.
 * @param typeId - Type ID of offending item.
 * @param excessAmount - Quantity to remove.
 * @returns Promise resolving once remediation and logging complete.
 */
async function handleAnomaly(player: Player, typeId: string, excessAmount: number): Promise<void> {
    player.sendMessage(`§2[§7Paradox§2] §o§cANOMALY: §7Detected §f${excessAmount}x §e${typeId}§7.`);

    const container = player.getComponent("inventory")?.container;
    if (!container) return;

    const remainingToDeduct = deductInventoryItems(container, typeId, excessAmount);

    const postState = getInventoryState(player);
    if (postState) {
        updateMemorySnapshot(player.id, {
            counts: postState.counts,
            containerHashes: postState.containerHashes,
            time: Date.now(),
            name: player.name,
        });
    }

    const actualDeducted = excessAmount - remainingToDeduct;
    await recordAuditLog(player.id, typeId, actualDeducted);
    alertStaff(player, `${typeId} (x${actualDeducted} removed)`);
}

/**
 * LIFECYCLE HOOKS
 */

/**
 * Handles player join events and builds their inventory snapshot baseline.
 *
 * @param event - Join event context.
 */
function onPlayerJoin(event: PlayerJoinAfterEvent): void {
    const playerId = event.playerId;

    system.runTimeout(async () => {
        const player = PlayerCache.getPlayerById(playerId);
        if (!player?.isValid) return;

        const state = getInventoryState(player);
        if (state) {
            updateMemorySnapshot(player.id, { ...state, time: Date.now(), name: player.name });
        }
    }, BUFFER_TICKS);
}

/**
 * Handles player disconnects and flushes runtime maps.
 *
 * @param event - Leave event context.
 * @returns Promise resolving after final snapshot save.
 */
async function onPlayerLeave(event: PlayerLeaveBeforeEvent): Promise<void> {
    const player = event.player;
    if (!player) return;

    const state = getInventoryState(player);
    if (state) {
        updateMemorySnapshot(player.id, { ...state, time: Date.now(), name: player.name });
    }

    snapshotCache.delete(player.id);
    playerInteractionWindow.delete(player.id);
    dimensionChangingPlayers.delete(player.id);
    deadPlayers.delete(player.id);
    processingLock.delete(player.id);
}

/**
 * Handles player dimension travel to apply event safeguards.
 *
 * @param event - Dimension change event context.
 */
function onDimensionChange(event: PlayerDimensionChangeAfterEvent): void {
    const player = event.player;
    if (!player?.isValid) return;

    dimensionChangingPlayers.add(player.id);

    system.runTimeout(() => {
        if (player?.isValid) {
            const state = getInventoryState(player);
            if (state) {
                updateMemorySnapshot(player.id, { ...state, time: Date.now(), name: player.name });
            }
        }
        dimensionChangingPlayers.delete(player.id);
    }, BUFFER_TICKS);
}

/**
 * Tracks player death events to suspend inventory checks temporarily.
 *
 * @param event - Entity death event context.
 */
function onPlayerDie(event: EntityDieAfterEvent): void {
    const entity = event.deadEntity;
    if (entity instanceof Player) {
        deadPlayers.add(entity.id);
    }
}

/**
 * Handles player respawn events and restores baseline verification.
 *
 * @param event - Spawn event context.
 */
function onPlayerSpawn(event: PlayerSpawnAfterEvent): void {
    const player = event.player;
    if (!player?.isValid) return;

    system.runTimeout(() => {
        if (!player?.isValid) return;

        if (deadPlayers.has(player.id)) {
            const state = getInventoryState(player);
            if (state) {
                updateMemorySnapshot(player.id, { ...state, time: Date.now(), name: player.name });
            }
            deadPlayers.delete(player.id);
        }
    }, BUFFER_TICKS);
}

/**
 * NOTIFICATION SYSTEM
 */

/**
 * Logs flags and alerts online level 4 security staff about a player anomaly.
 *
 * @param player - Target player flagged.
 * @param summaryMessage - Descriptive alert body.
 */
function alertStaff(player: Player, summaryMessage: string): void {
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    FlagManager.logFlag(player, "InvSync", `Inventory anomaly corrected: ${summaryMessage}`);
    for (const s of staff) {
        if (s?.isValid && s.id !== player.id) {
            s.sendMessage(`§2[§7Paradox§2]§o§7 §e[InvSync] §f${player.name} §7flagged: §c${summaryMessage}`);
        }
    }
}

/**
 * Sends module system status messages to level 4 security staff.
 *
 * @param message - Message content to dispatch.
 */
function alertStaffSystem(message: string): void {
    const staff = SecurityClearanceManager.getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s?.isValid) s.sendMessage(`§2[§7Paradox§2]§o§7 ${message}`);
    }
}

/**
 * MODULE CONTROLLERS
 */

/**
 * Initializes and starts the InvSync protection module.
 *
 * @returns Promise resolving when initialization finishes.
 */
export async function startInvSync(): Promise<void> {
    if (isModuleActive) return;
    isModuleActive = true;

    await migrateLegacySnapshots();

    joinSub = onPlayerJoin;
    leaveSub = onPlayerLeave;
    dimensionSub = onDimensionChange;
    dieSub = onPlayerDie;
    spawnSub = onPlayerSpawn;
    itemChangeSub = onInventoryItemChanged;
    blockBreakSub = onPlayerBreakBlockBefore;

    EventCoordinator.subscribeAfter("playerJoin", joinSub);
    EventCoordinator.subscribeBefore("playerLeave", leaveSub);
    EventCoordinator.subscribeAfter("playerDimensionChange", dimensionSub);
    EventCoordinator.subscribeAfter("entityDie", dieSub);
    EventCoordinator.subscribeAfter("playerSpawn", spawnSub);
    EventCoordinator.subscribeAfter("playerInventoryItemChange", itemChangeSub);
    EventCoordinator.subscribeBefore("playerBreakBlock", blockBreakSub);

    pickupSub = (event: EntityItemPickupAfterEvent) => {
        if (event.entity instanceof Player && event.entity.isValid) {
            recordPlayerInteraction(event.entity.id);
        }
    };
    world.afterEvents.entityItemPickup.subscribe(pickupSub);

    for (const player of PlayerCache.getPlayers()) {
        if (player?.isValid) {
            const state = getInventoryState(player);
            if (state) {
                updateMemorySnapshot(player.id, { ...state, time: Date.now(), name: player.name });
            }
        }
    }

    dbFlushIntervalId = system.runInterval(async () => {
        await flushDirtySnapshots();
    }, 100);

    cleanupIntervalId = system.runInterval(async () => {
        await runDatabaseVacuum();
    }, CLEANUP_INTERVAL_TICKS);

    alertStaffSystem("§7InvSync framework §astarted§7.");
}

/**
 * Disables the InvSync protection module and cleans up all event subscriptions and timers.
 */
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

    if (pickupSub) {
        world.afterEvents.entityItemPickup.unsubscribe(pickupSub);
    }

    if (dbFlushIntervalId !== undefined) {
        system.clearRun(dbFlushIntervalId);
        dbFlushIntervalId = undefined;
    }
    if (cleanupIntervalId !== undefined) {
        system.clearRun(cleanupIntervalId);
        cleanupIntervalId = undefined;
    }

    joinSub = leaveSub = dimensionSub = dieSub = spawnSub = itemChangeSub = blockBreakSub = pickupSub = undefined;

    snapshotCache.clear();
    playerInteractionWindow.clear();
    dimensionChangingPlayers.clear();
    deadPlayers.clear();
    processingLock.clear();
    dirtySnapshots.clear();
    shulkerHashRegistry.clear();

    alertStaffSystem("§7InvSync framework §4stopped§7.");
}

/**
 * Manually executes duplicate container checks across all online players.
 *
 * @returns Promise resolving when manual verification completes.
 */
export async function forceCheckAll(): Promise<void> {
    for (const player of PlayerCache.getPlayers()) {
        if (!player?.isValid || dimensionChangingPlayers.has(player.id) || deadPlayers.has(player.id)) continue;

        try {
            const snapshot = snapshotCache.get(player.id) ?? ((await invSyncSnapshotsDB.get(player.id)) as InvSyncSnapshot | undefined);
            const state = getInventoryState(player);
            if (!snapshot || !state) continue;

            const duplicateHash = findDuplicateHash(state.containerHashes);
            if (duplicateHash) {
                await handleAnomaly(player, "Duplicated Payload Container", 1);
            }
        } catch (e) {
            console.error(`[Paradox] Manual Scan Failure [${player.name}]: ${e}`);
        }
    }
}

/**
 * Forces an immediate snapshot update in memory for every active player.
 *
 * @returns Promise resolving when all active entities are snapshotted.
 */
export async function forceSnapshotAll(): Promise<void> {
    for (const player of PlayerCache.getPlayers()) {
        if (!player?.isValid) continue;
        const state = getInventoryState(player);
        if (state) {
            updateMemorySnapshot(player.id, { ...state, time: Date.now(), name: player.name });
        }
    }
    alertStaffSystem("§2[§7Paradox§2]§o§7 Forced inventory snapshot for all online entities.");
}

/**
 * Purges all snapshot cache state and persistent database records.
 *
 * @returns Promise resolving when database and cache clearing finishes.
 */
export async function clearAllSnapshots(): Promise<void> {
    try {
        await invSyncSnapshotsDB.clear();
        await invSyncAuditDB.clear();
    } catch (e) {
        console.error(`[Paradox] DB Clear Error: ${e}`);
    }

    snapshotCache.clear();
    playerInteractionWindow.clear();
    dimensionChangingPlayers.clear();
    deadPlayers.clear();
    processingLock.clear();
    dirtySnapshots.clear();
    shulkerHashRegistry.clear();

    alertStaffSystem("§2[§7Paradox§2]§o§7 Baseline inventory snapshots cleared.");
}
