import { world, system, Player, PlayerInventoryItemChangeAfterEvent, PlayerLeaveBeforeEvent, PlayerJoinAfterEvent } from "@minecraft/server";
import { invSyncSnapshotsDB, invSyncAuditDB } from "../event-listeners/world-initialize";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

/**
 * Configuration
 */
const SNAPSHOT_INTERVAL_TICKS = 100; // ~5 seconds
const JOIN_DELAY_TICKS = 20; // ~1 second after join
const MAX_AUDIT_EVENTS = 200;
const SNAPSHOT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ITEM_TOLERANCE = 0;

/**
 * Runtime state
 */
let running = false;
let joinSub: any = null;
let leaveSub: any = null;
let inventoryChangeSub: any = null;
let intervalId: any = null;

const pendingJoinChecks = new Map<string, number>();
const pendingInventoryChecks = new Map<string, boolean>();

/**
 * Stored inventory snapshot structure.
 * Counts are aggregated per item type.
 */
interface InvSyncSnapshot {
    counts: Record<string, number>;
    time: number;
    name: string;
}

/**
 * Starts the InvSync module.
 * Subscribes to events, schedules maintenance loop,
 * and initializes baseline snapshots.
 */
export async function startInvSync() {
    if (running) return;
    running = true;

    joinSub = world.afterEvents.playerJoin.subscribe(onPlayerJoin);
    leaveSub = world.beforeEvents.playerLeave.subscribe(onPlayerLeave);
    inventoryChangeSub = world.afterEvents.playerInventoryItemChange.subscribe(onInventoryChange);

    intervalId = system.runInterval(tickLoop, SNAPSHOT_INTERVAL_TICKS);

    await snapshotAllPlayers();
    alertStaffSystem("§2[§7Paradox§2]§o§7 §aInvSync module started.");
}

/**
 * Stops the InvSync module and unsubscribes from all listeners.
 */
export function stopInvSync() {
    if (!running) return;
    running = false;

    if (joinSub) world.afterEvents.playerJoin.unsubscribe(joinSub);
    if (leaveSub) world.beforeEvents.playerLeave.unsubscribe(leaveSub);
    if (inventoryChangeSub) world.afterEvents.playerInventoryItemChange.unsubscribe(inventoryChangeSub);
    if (intervalId) system.clearRun(intervalId);

    joinSub = null;
    leaveSub = null;
    inventoryChangeSub = null;
    intervalId = null;

    alertStaffSystem("§2[§7Paradox§2]§o§7 §cInvSync module stopped.");
}

/**
 * Maintenance loop.
 * Processes delayed join checks and removes expired snapshots.
 */
async function tickLoop() {
    if (!running) return;

    await processPendingJoins();
    await cleanExpiredSnapshots();
}

/**
 * Forces a snapshot refresh for all online players.
 */
export async function forceSnapshotAll() {
    await snapshotAllPlayers();
}

/**
 * Captures current inventory state for all online players.
 */
async function snapshotAllPlayers() {
    for (const player of world.getPlayers()) {
        const counts = getInventoryCounts(player);
        if (!counts) continue;

        await invSyncSnapshotsDB.set(player.id, {
            counts,
            time: Date.now(),
            name: player.name,
        });
    }
}

/**
 * Saves a final snapshot when a player leaves.
 */
function onPlayerLeave(event: PlayerLeaveBeforeEvent) {
    const player = event.player;
    if (!player) return;

    const counts = getInventoryCounts(player);
    if (!counts) return;

    invSyncSnapshotsDB.set(player.id, {
        counts,
        time: Date.now(),
        name: player.name,
    });
}

/**
 * Schedules a delayed inventory verification after player join.
 */
function onPlayerJoin(event: PlayerJoinAfterEvent) {
    pendingJoinChecks.set(event.playerId, system.currentTick + JOIN_DELAY_TICKS);
}

/**
 * Executes delayed join validations.
 */
async function processPendingJoins() {
    const currentTick = system.currentTick;

    for (const [playerId, scheduledTick] of pendingJoinChecks) {
        if (currentTick >= scheduledTick) {
            const player = world.getPlayers().find((p) => p.id === playerId);
            if (player) await checkPlayerInventory(player);
            pendingJoinChecks.delete(playerId);
        }
    }
}

/**
 * Forces immediate validation for all online players.
 */
export async function forceCheckAll() {
    for (const player of world.getPlayers()) {
        await checkPlayerInventory(player);
    }
}

/**
 * Inventory change listener with debounce protection.
 * Prevents multi-slot updates from triggering duplicate anomaly checks.
 */
async function onInventoryChange(event: PlayerInventoryItemChangeAfterEvent) {
    const player = event.player;

    if (!pendingInventoryChecks.has(player.id)) {
        pendingInventoryChecks.set(player.id, true);

        system.runTimeout(async () => {
            pendingInventoryChecks.delete(player.id);
            await debouncedInventoryCheck(player);
        }, 1);
    }
}

/**
 * Performs a consolidated inventory comparison after debounce delay.
 */
async function debouncedInventoryCheck(player: Player) {
    const snapshot: InvSyncSnapshot = invSyncSnapshotsDB.get(player.id) ?? {
        counts: {},
        time: Date.now(),
        name: player.name,
    };

    const current = getInventoryCounts(player);
    if (!current) return;

    const excess: Record<string, number> = {};
    let totalExcess = 0;

    for (const item in current) {
        const diff = current[item] - (snapshot.counts[item] ?? 0);
        if (diff > ITEM_TOLERANCE) {
            excess[item] = diff;
            totalExcess += diff;
        }
    }

    if (totalExcess > 0) {
        console.log(`[InvSync] Debounced anomaly for ${player.name}: +${totalExcess} items`);
        await handleAnomaly(player, excess, totalExcess);
    }

    snapshot.counts = current;
    snapshot.time = Date.now();
    await invSyncSnapshotsDB.set(player.id, snapshot);
}

/**
 * Full periodic inventory comparison.
 * Used during join validation and manual checks.
 */
async function checkPlayerInventory(player: Player) {
    const snapshot: InvSyncSnapshot = invSyncSnapshotsDB.get(player.id) ?? {
        counts: {},
        time: Date.now(),
        name: player.name,
    };

    const current = getInventoryCounts(player);
    if (!current) return;

    const excess: Record<string, number> = {};
    let totalExcess = 0;

    for (const item in current) {
        const diff = current[item] - (snapshot.counts[item] ?? 0);
        if (diff > ITEM_TOLERANCE) {
            excess[item] = diff;
            totalExcess += diff;
        }
    }

    if (totalExcess > 0) {
        console.log(`[InvSync] Periodic anomaly for ${player.name}: +${totalExcess} items`);
        await handleAnomaly(player, excess, totalExcess);
    }

    snapshot.counts = current;
    snapshot.time = Date.now();
    await invSyncSnapshotsDB.set(player.id, snapshot);
}

/**
 * Handles anomaly response:
 *  - Notifies player
 *  - Removes excess items
 *  - Records immutable audit entry
 *  - Alerts staff
 */
async function handleAnomaly(player: Player, excess: Record<string, number>, totalExcess: number) {
    const excessSnapshot: Record<string, number> = JSON.parse(JSON.stringify(excess));

    player.sendMessage(`§2[§7Paradox§2]§o§7 §cInventory anomaly detected: §e${totalExcess} §cexcess items.`);

    removeExcessItems(player, excess);

    const audit = invSyncAuditDB.get(player.id) ?? { events: [] };

    audit.events.push({
        time: Date.now(),
        excessItems: excessSnapshot,
        totalExcess,
    });

    if (audit.events.length > MAX_AUDIT_EVENTS) {
        audit.events = audit.events.slice(-MAX_AUDIT_EVENTS);
    }

    await invSyncAuditDB.set(player.id, audit);

    alertStaff(player, totalExcess);
}

/**
 * Notifies Level 4 staff members of anomaly detection.
 */
function alertStaff(player: Player, totalExcess: number) {
    const staff = getSecurityClearanceLevel4Players();

    for (const s of staff) {
        if (s.id === player.id) continue;

        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[InvSync] §f${player.name} §7Excess: §e${totalExcess}`);
    }
}

/**
 * Broadcasts a system-level message to Level 4 staff.
 */
function alertStaffSystem(message: string) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        s.sendMessage(`§2[§7Paradox§2]§o§7 ${message}`);
    }
}

/**
 * Removes excess items from player inventory.
 * Stops early once required removals are satisfied.
 */
function removeExcessItems(player: Player, excess: Record<string, number>) {
    const container = player.getComponent("inventory")?.container;
    if (!container) return;

    let remainingExcess = Object.values(excess).reduce((sum, v) => sum + v, 0);

    if (remainingExcess <= 0) return;

    for (let i = 0; i < container.size; i++) {
        if (remainingExcess <= 0) break;

        const item = container.getItem(i);
        if (!item) continue;

        const type = item.typeId;
        const excessAmount = excess[type];
        if (!excessAmount) continue;

        if (item.amount <= excessAmount) {
            container.setItem(i, undefined);
            remainingExcess -= item.amount;
            excess[type] = 0;
        } else {
            item.amount -= excessAmount;
            container.setItem(i, item);
            remainingExcess -= excessAmount;
            excess[type] = 0;
        }

        if (excess[type] <= 0) delete excess[type];
    }
}

/**
 * Removes expired snapshots based on retention policy.
 */
async function cleanExpiredSnapshots() {
    await invSyncSnapshotsDB.clean((_: string | number, value: InvSyncSnapshot) => Date.now() - value.time < SNAPSHOT_EXPIRY_MS);
}

/**
 * Clears all stored snapshots and audit records.
 */
export async function clearAllSnapshots() {
    await invSyncSnapshotsDB.clear();
    await invSyncAuditDB.clear();
}

/**
 * Aggregates total item counts from a player's inventory.
 */
function getInventoryCounts(player: Player): Record<string, number> | null {
    const container = player.getComponent("inventory")?.container;
    if (!container) return null;

    const counts: Record<string, number> = {};

    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;

        counts[item.typeId] = (counts[item.typeId] ?? 0) + item.amount;
    }

    return counts;
}
