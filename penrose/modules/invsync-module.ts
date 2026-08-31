import { system, world, Player, PlayerJoinAfterEvent, PlayerLeaveBeforeEvent, PlayerDimensionChangeAfterEvent, PlayerSpawnAfterEvent, PlayerInventoryItemChangeAfterEvent, EntityDieAfterEvent, ItemStack } from "@minecraft/server";
import { invSyncSnapshotsDB, invSyncAuditDB } from "../event-listeners/world-initialize";
import { SecurityClearanceManager } from "../classes/cache/level-four-security-tracker";
import { PlayerCache } from "../classes/cache/player-cache";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { FlagManager } from "../classes/logging/flag-manager";

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
 * Represents a saved inventory state snapshot for a player.
 */
interface InvSyncSnapshot {
    /** Item count mapped by item type ID. */
    counts: Record<string, number>;
    /** Hash array for container and unique items. */
    containerHashes: string[];
    /** Unix timestamp (ms) when snapshot was recorded. */
    time: number;
    /** Cached player display name. */
    name: string;
}

/**
 * Represents a single logged inventory anomaly event.
 */
interface InvSyncAuditEvent {
    /** Unix timestamp (ms) of occurrence. */
    time: number;
    /** Map of removed item type IDs to their quantities. */
    excessItems: Record<string, number>;
    /** Total sum of items removed. */
    totalExcess: number;
}

/**
 * Represents the structured audit database container for a player.
 */
interface InvSyncAuditContainer {
    /** Array of logged audit records. */
    events: InvSyncAuditEvent[];
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

// Cached Subscriber References
let joinSub: ((arg: PlayerJoinAfterEvent) => void) | undefined;
let leaveSub: ((arg: PlayerLeaveBeforeEvent) => void) | undefined;
let dimensionSub: ((arg: PlayerDimensionChangeAfterEvent) => void) | undefined;
let spawnSub: ((arg: PlayerSpawnAfterEvent) => void) | undefined;
let dieSub: ((arg: EntityDieAfterEvent) => void) | undefined;
let itemChangeSub: ((arg: PlayerInventoryItemChangeAfterEvent) => void) | undefined;
let pickupSub: ((arg: any) => void) | undefined;

/**
 * Generates a lightweight payload signature for container items (Bundles, Shulkers, Unique Items).
 *
 * @param item - ItemStack to evaluate.
 * @returns Serialized hash string of item metadata.
 */
function getItemPayloadHash(item: ItemStack): string {
    const loreData = item.getLore().join("|");
    const nameTag = item.nameTag ?? "";
    return `${item.typeId}:${item.amount}:${nameTag}:${loreData}`;
}

/**
 * Aggregates current inventory item totals and generates item hashes.
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
        if (!item) continue;

        counts[item.typeId] = (counts[item.typeId] ?? 0) + item.amount;

        // Extract fingerprints for non-stackable items, bundles, or shulker containers
        if (item.maxAmount === 1 || item.typeId.includes("bundle") || item.typeId.includes("shulker")) {
            containerHashes.push(getItemPayloadHash(item));
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
        const keys: string[] = typeof (invSyncSnapshotsDB as any).keys === "function" ? await (invSyncSnapshotsDB as any).keys() : [];

        for (const key of keys) {
            const record = await invSyncSnapshotsDB.get(key);
            if (record && !Array.isArray(record.containerHashes)) {
                record.containerHashes = [];
                await invSyncSnapshotsDB.set(key, record);
            }
        }
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
        if (typeof (invSyncSnapshotsDB as any).clean === "function") {
            await (invSyncSnapshotsDB as any).clean((_: string | number, value: InvSyncSnapshot) => Date.now() - value.time < SNAPSHOT_EXPIRY_MS, { silent: true });
        }
    } catch (e) {
        console.error(`[Paradox] Vacuum Error: ${e}`);
    }
}

/**
 * CORE ANOMALY DETECTION ENGINE
 * Evaluates item mutations using Hash Validation.
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
        let snapshot = snapshotCache.get(playerId);
        if (!snapshot) {
            const dbRecord = await invSyncSnapshotsDB.get(playerId);
            snapshot = {
                counts: dbRecord?.counts ?? {},
                containerHashes: dbRecord?.containerHashes ?? [],
                time: dbRecord?.time ?? Date.now(),
                name: dbRecord?.name ?? player.name,
            };
            snapshotCache.set(playerId, snapshot);
        }

        const state = getInventoryState(player);
        if (!state) return;

        // 1. HASH VERIFICATION: Checks for exact duplicate container/item signatures inside inventory
        const duplicateHash = state.containerHashes.find((hash, idx) => state.containerHashes.indexOf(hash) !== idx);
        if (duplicateHash) {
            await handleAnomaly(player, typeId, 1);
            return;
        }

        // 2. PASS TRANSACTION: Update active memory snapshot with legitimate new baseline
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

    try {
        const audit: InvSyncAuditContainer = (await invSyncAuditDB.get(player.id)) ?? { events: [] };
        audit.events.push({
            time: Date.now(),
            excessItems: { [typeId]: actualDeducted },
            totalExcess: actualDeducted,
        });

        if (audit.events.length > MAX_AUDIT_EVENTS) {
            audit.events = audit.events.slice(-MAX_AUDIT_EVENTS);
        }
        await invSyncAuditDB.set(player.id, audit);
    } catch (e) {
        console.error(`[Paradox] Audit Log Save Error [${player.name}]: ${e}`);
    }

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

    // 1. Migrate older database formats to support containerHashes
    await migrateLegacySnapshots();

    // 2. Assign subscribers
    joinSub = onPlayerJoin;
    leaveSub = onPlayerLeave;
    dimensionSub = onDimensionChange;
    dieSub = onPlayerDie;
    spawnSub = onPlayerSpawn;
    itemChangeSub = onInventoryItemChanged;

    EventCoordinator.subscribeAfter("playerJoin", joinSub);
    EventCoordinator.subscribeBefore("playerLeave", leaveSub);
    EventCoordinator.subscribeAfter("playerDimensionChange", dimensionSub);
    EventCoordinator.subscribeAfter("entityDie", dieSub);
    EventCoordinator.subscribeAfter("playerSpawn", spawnSub);
    EventCoordinator.subscribeAfter("playerInventoryItemChange", itemChangeSub);

    // Track ground item pickups to maintain interaction window timestamps
    pickupSub = (event: any) => {
        if (event?.player?.id) {
            recordPlayerInteraction(event.player.id);
        }
    };
    if ((world.afterEvents as any).playerPickupItem) {
        (world.afterEvents as any).playerPickupItem.subscribe(pickupSub);
    }

    // 3. Populate memory cache for online players
    for (const player of PlayerCache.getPlayers()) {
        if (player?.isValid) {
            const state = getInventoryState(player);
            if (state) {
                updateMemorySnapshot(player.id, { ...state, time: Date.now(), name: player.name });
            }
        }
    }

    // 4. Start background flush task (Runs every ~5 seconds)
    dbFlushIntervalId = system.runInterval(async () => {
        await flushDirtySnapshots();
    }, 100);

    // 5. Start background vacuum task
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

    if (pickupSub && (world.afterEvents as any).playerPickupItem) {
        (world.afterEvents as any).playerPickupItem.unsubscribe(pickupSub);
    }

    if (dbFlushIntervalId !== undefined) {
        system.clearRun(dbFlushIntervalId);
        dbFlushIntervalId = undefined;
    }
    if (cleanupIntervalId !== undefined) {
        system.clearRun(cleanupIntervalId);
        cleanupIntervalId = undefined;
    }

    joinSub = leaveSub = dimensionSub = dieSub = spawnSub = itemChangeSub = pickupSub = undefined;

    snapshotCache.clear();
    playerInteractionWindow.clear();
    dimensionChangingPlayers.clear();
    deadPlayers.clear();
    processingLock.clear();
    dirtySnapshots.clear();

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
            const snapshot = snapshotCache.get(player.id) ?? (await invSyncSnapshotsDB.get(player.id));
            const state = getInventoryState(player);
            if (!snapshot || !state) continue;

            // Scan for duplicate payload hashes across current state
            const duplicateHash = state.containerHashes.find((hash, idx) => state.containerHashes.indexOf(hash) !== idx);
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
        if (typeof (invSyncSnapshotsDB as any).clear === "function") {
            await (invSyncSnapshotsDB as any).clear();
            await (invSyncAuditDB as any).clear();
        } else {
            for (const player of PlayerCache.getPlayers()) {
                if (player?.isValid) {
                    await invSyncSnapshotsDB.delete(player.id);
                }
            }
        }
    } catch (e) {
        console.error(`[Paradox] DB Clear Error: ${e}`);
    }

    snapshotCache.clear();
    playerInteractionWindow.clear();
    dimensionChangingPlayers.clear();
    deadPlayers.clear();
    processingLock.clear();
    dirtySnapshots.clear();

    alertStaffSystem("§2[§7Paradox§2]§o§7 Baseline inventory snapshots cleared.");
}
