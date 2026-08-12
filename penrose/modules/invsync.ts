import { system, Player, PlayerJoinAfterEvent, PlayerLeaveBeforeEvent, PlayerDimensionChangeAfterEvent, PlayerSpawnAfterEvent, PlayerInventoryItemChangeAfterEvent, EntityDieAfterEvent, ItemTypes, ItemStack } from "@minecraft/server";
import { invSyncSnapshotsDB, invSyncAuditDB } from "../event-listeners/world-initialize";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { PlayerCache } from "../classes/player-cache";
import { EventCoordinator } from "../classes/event-coordinator";

/**
 * CONFIGURATION
 */
const MAX_AUDIT_EVENTS = 200;
const BUFFER_TICKS = 40; // 2 seconds safety window for loading/respawning
const SNAPSHOT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days expiration for offline players
const CLEANUP_INTERVAL_TICKS = 6000; // Run database vacuum operations every ~5 minutes

/**
 * RUNTIME STATE & LIFECYCLE FLAGS
 */
let isModuleActive = false;
let cleanupIntervalId: number | undefined;

const dimensionChangingPlayers = new Set<string>();
const deadPlayers = new Set<string>();

// Cached Subscriber References
let joinSub: ((arg: PlayerJoinAfterEvent) => void) | undefined;
let leaveSub: ((arg: PlayerLeaveBeforeEvent) => void) | undefined;
let dimensionSub: ((arg: PlayerDimensionChangeAfterEvent) => void) | undefined;
let spawnSub: ((arg: PlayerSpawnAfterEvent) => void) | undefined;
let dieSub: ((arg: any) => void) | undefined;
let itemChangeSub: ((arg: PlayerInventoryItemChangeAfterEvent) => void) | undefined;

/**
 * TYPE DEFINITIONS
 */
interface InvSyncSnapshot {
    counts: Record<string, number>;
    time: number;
    name: string;
}

/**
 * UTILITY: Helper to retrieve max stack size for any typeId safely.
 */
const stackSizeCache = new Map<string, number>();

function getMaxStackSize(typeId: string): number {
    if (stackSizeCache.has(typeId)) {
        return stackSizeCache.get(typeId)!;
    }

    try {
        const itemType = ItemTypes.get(typeId);
        if (itemType) {
            const tempStack = new ItemStack(itemType, 1);
            const max = tempStack.maxAmount;
            stackSizeCache.set(typeId, max);
            return max;
        }
    } catch {
        // Fallback for custom or invalid items
    }

    return 64;
}

/**
 * UTILITY: Safe Mapping of Present Inventory State
 */
function getInventoryCounts(player: Player): Record<string, number> | null {
    if (!player.isValid) return null;
    const container = player.getComponent("inventory")?.container;
    if (!container) return null;

    const counts: Record<string, number> = {};
    for (let i = 0; i < container.size; i++) {
        try {
            const item = container.getItem(i);
            if (!item) continue;
            counts[item.typeId] = (counts[item.typeId] ?? 0) + item.amount;
        } catch {
            continue;
        }
    }
    return counts;
}

/**
 * SYSTEM HOOK: Periodic Database Garbage Collection
 * Ported from Script 2 to stop database bloat from offline/historical data.
 */
function runDatabaseVacuum() {
    try {
        if (typeof (invSyncSnapshotsDB as any).clean === "function") {
            (invSyncSnapshotsDB as any).clean((_: string | number, value: InvSyncSnapshot) => Date.now() - value.time < SNAPSHOT_EXPIRY_MS, { silent: true });
        }
    } catch (e) {
        console.error(`[Paradox] Error vacuuming expired database entries: ${e}`);
    }
}

/**
 * CORE AUDIT EVENT: Evaluates precise item slot modifications instantly
 */
async function onInventoryItemChanged(event: PlayerInventoryItemChangeAfterEvent) {
    const player = event.player;
    if (!player || !player.isValid) return;

    // STATE SAFETY GUARD: Ignore mutations during unstable engine processing windows
    if (dimensionChangingPlayers.has(player.id) || deadPlayers.has(player.id)) return;

    const container = player.getComponent("inventory")?.container;
    if (!container) return;

    const typeId = event.itemStack?.typeId ?? event.beforeItemStack?.typeId;
    if (!typeId) return;

    let snapshot: InvSyncSnapshot;
    try {
        snapshot = (await invSyncSnapshotsDB.get(player.id)) ?? {
            counts: {},
            time: Date.now(),
            name: player.name,
        };
    } catch (e) {
        console.error(`[Paradox] Failed to retrieve snapshot read for ${player.name}: ${e}`);
        return;
    }

    const currentCounts = getInventoryCounts(player);
    if (!currentCounts) return;

    const currentAmount = currentCounts[typeId] ?? 0;
    const expectedAmount = snapshot.counts[typeId] ?? 0;

    // Evaluate Spikes against the item's specific stack size limit
    if (currentAmount > expectedAmount) {
        const excessAmount = currentAmount - expectedAmount;

        // Use event itemStack maxAmount if available; fall back to cached lookup
        const maxStackSize = event.itemStack?.maxAmount ?? getMaxStackSize(typeId);

        if (excessAmount > maxStackSize) {
            await handleAnomaly(player, typeId, excessAmount);
            return; // Exit early; handleAnomaly performs its own fresh sync write
        }
    }

    // Keep the snapshot dynamically up to date with natural progression steps
    snapshot.counts = currentCounts;
    snapshot.time = Date.now();

    try {
        invSyncSnapshotsDB.set(player.id, snapshot);
    } catch (e) {
        console.error(`[Paradox] Failure updating runtime baseline for ${player.name}: ${e}`);
    }
}

/**
 * CRITICAL CORRECTION ENGINE: Safe, Precise Stack Deduction
 */
async function handleAnomaly(player: Player, typeId: string, excessAmount: number) {
    player.sendMessage(`§2[§7Paradox§2]§o§7 §cInventory anomaly detected: §e${excessAmount}x ${typeId}.`);

    const container = player.getComponent("inventory")?.container;
    if (!container) return;

    let remainingToDeduct = excessAmount;

    // Sequentially reduce only the explicit item variant causing the alert
    for (let i = 0; i < container.size; i++) {
        if (remainingToDeduct <= 0) break;

        try {
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
        } catch (e) {
            console.error(`[Paradox] Error correcting slot index ${i} on player ${player.name}: ${e}`);
        }
    }

    // Post-Correction Synchronization Update
    const postCounts = getInventoryCounts(player);
    if (postCounts) {
        try {
            invSyncSnapshotsDB.set(player.id, {
                counts: postCounts,
                time: Date.now(),
                name: player.name,
            });
        } catch (e) {
            console.error(`[Paradox] Failed writing post-correction update for ${player.name}: ${e}`);
        }
    }

    // Process Logging via implicit type inference
    const actualDeducted = excessAmount - remainingToDeduct;

    try {
        const audit = (await invSyncAuditDB.get(player.id)) ?? { events: [] };
        audit.events.push({
            time: Date.now(),
            excessItems: { [typeId]: actualDeducted },
            totalExcess: actualDeducted,
        });

        if (audit.events.length > MAX_AUDIT_EVENTS) {
            audit.events = audit.events.slice(-MAX_AUDIT_EVENTS);
        }
        invSyncAuditDB.set(player.id, audit);
    } catch (e) {
        console.error(`[Paradox] Failed writing logging trail data for ${player.name}: ${e}`);
    }

    alertStaff(player, `${typeId} (x${actualDeducted} removed)`);
}

/**
 * ENGINE STATE RECOVERY HOOKS
 */
function onPlayerJoin(event: PlayerJoinAfterEvent) {
    const playerId = event.playerId;

    system.runTimeout(() => {
        const player = PlayerCache.getPlayerById(playerId);
        if (!player || !player.isValid) return;

        const counts = getInventoryCounts(player);
        if (counts) {
            try {
                invSyncSnapshotsDB.set(player.id, { counts, time: Date.now(), name: player.name });
            } catch (e) {
                console.error(`[Paradox] Failed writing join baseline initialization for ${player.name}: ${e}`);
            }
        }
    }, BUFFER_TICKS);
}

function onPlayerLeave(event: PlayerLeaveBeforeEvent) {
    const player = event.player;
    if (!player) return;

    const counts = getInventoryCounts(player);
    if (counts) {
        try {
            invSyncSnapshotsDB.set(player.id, { counts, time: Date.now(), name: player.name });
        } catch (e) {
            console.error(`[Paradox] Failed writing post-session save file baseline for ${player.name}: ${e}`);
        }
    }
    dimensionChangingPlayers.delete(player.id);
    deadPlayers.delete(player.id);
}

function onDimensionChange(event: PlayerDimensionChangeAfterEvent) {
    const player = event.player;
    if (!player?.isValid) return;

    dimensionChangingPlayers.add(player.id);

    system.runTimeout(() => {
        if (!player.isValid) {
            dimensionChangingPlayers.delete(player.id);
            return;
        }
        const counts = getInventoryCounts(player);
        if (counts) {
            try {
                invSyncSnapshotsDB.set(player.id, { counts, time: Date.now(), name: player.name });
            } catch (e) {
                console.error(`[Paradox] Failed updating cross-dimension synchronization baseline for ${player.name}: ${e}`);
            }
        }
        dimensionChangingPlayers.delete(player.id);
    }, BUFFER_TICKS);
}

function onPlayerDie(event: EntityDieAfterEvent) {
    const entity = event.deadEntity;
    if (entity instanceof Player) {
        deadPlayers.add(entity.id);
    }
}

function onPlayerSpawn(event: PlayerSpawnAfterEvent) {
    const player = event.player;
    if (!player?.isValid) return;

    system.runTimeout(() => {
        if (!player.isValid) return;

        if (deadPlayers.has(player.id)) {
            const counts = getInventoryCounts(player);
            if (counts) {
                try {
                    invSyncSnapshotsDB.set(player.id, { counts, time: Date.now(), name: player.name });
                } catch (e) {
                    console.error(`[Paradox] Failed writing post-respawn recovery baseline for ${player.name}: ${e}`);
                }
            }
            deadPlayers.delete(player.id);
        }
    }, BUFFER_TICKS);
}

/**
 * NOTIFICATION ENGINE
 */
function alertStaff(player: Player, summaryMessage: string) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s.isValid && s.id !== player.id) {
            s.sendMessage(`§2[§7Paradox§2]§o§7 §e[InvSync] §f${player.name} §7flagged: §c${summaryMessage}`);
        }
    }
}

function alertStaffSystem(message: string) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s.isValid) s.sendMessage(`§2[§7Paradox§2]§o§7 ${message}`);
    }
}

/**
 * SYSTEM LIFECYCLE MANAGEMENT (EVENT RUNTIME ROUTER)
 */
export function startInvSync() {
    if (isModuleActive) return;
    isModuleActive = true;

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

    // Run active session scans for current online pool instantly
    for (const player of PlayerCache.getPlayers()) {
        if (player.isValid) {
            const counts = getInventoryCounts(player);
            if (counts) {
                try {
                    invSyncSnapshotsDB.set(player.id, { counts, time: Date.now(), name: player.name });
                } catch (e) {
                    console.error(`[Paradox] Initialization snapshot failure during live hook for ${player.name}: ${e}`);
                }
            }
        }
    }

    // Ported background vacuum task from Script 2 (Throttled cleanly via safe intervals)
    cleanupIntervalId = system.runInterval(() => {
        runDatabaseVacuum();
    }, CLEANUP_INTERVAL_TICKS);

    alertStaffSystem("§7InvSync framework §astarted§7.");
}

export function stopInvSync() {
    if (!isModuleActive) return;
    isModuleActive = false;

    if (joinSub) EventCoordinator.unsubscribeAfter("playerJoin", joinSub);
    if (leaveSub) EventCoordinator.unsubscribeBefore("playerLeave", leaveSub);
    if (dimensionSub) EventCoordinator.unsubscribeAfter("playerDimensionChange", dimensionSub);
    if (dieSub) EventCoordinator.unsubscribeAfter("entityDie", dieSub);
    if (spawnSub) EventCoordinator.unsubscribeAfter("playerSpawn", spawnSub);
    if (itemChangeSub) EventCoordinator.unsubscribeAfter("playerInventoryItemChange", itemChangeSub);

    if (cleanupIntervalId !== undefined) {
        system.clearRun(cleanupIntervalId);
        cleanupIntervalId = undefined;
    }

    joinSub = leaveSub = dimensionSub = dieSub = spawnSub = itemChangeSub = undefined;

    dimensionChangingPlayers.clear();
    deadPlayers.clear();

    alertStaffSystem("§7InvSync framework §4stopped§7.");
}

export async function forceCheckAll() {
    for (const player of PlayerCache.getPlayers()) {
        if (!player.isValid || dimensionChangingPlayers.has(player.id) || deadPlayers.has(player.id)) continue;

        try {
            const snapshot = await invSyncSnapshotsDB.get(player.id);
            const current = getInventoryCounts(player);
            if (!snapshot || !current) continue;

            for (const item in current) {
                const delta = current[item] - (snapshot.counts[item] ?? 0);

                // Dynamic stack threshold calculation per item type
                const maxStackSize = getMaxStackSize(item);

                if (delta > maxStackSize) {
                    handleAnomaly(player, item, delta);
                }
            }
        } catch (e) {
            console.error(`[Paradox] Failed to complete manual verification scan for ${player.name}: ${e}`);
        }
    }
}

export function forceSnapshotAll() {
    for (const player of PlayerCache.getPlayers()) {
        if (!player.isValid) continue;
        const counts = getInventoryCounts(player);
        if (counts) {
            try {
                invSyncSnapshotsDB.set(player.id, {
                    counts,
                    time: Date.now(),
                    name: player.name,
                });
            } catch (e) {
                console.error(`[Paradox] Emergency forced database snapshot failed for ${player.name}: ${e}`);
            }
        }
    }
    alertStaffSystem("§2[§7Paradox§2]§o§7 Forced a fresh inventory snapshot update for all online entities.");
}

export function clearAllSnapshots() {
    try {
        // Safe clear implementation ported from Script 2
        if (typeof (invSyncSnapshotsDB as any).clear === "function") {
            (invSyncSnapshotsDB as any).clear();
            (invSyncAuditDB as any).clear();
        } else {
            for (const player of PlayerCache.getPlayers()) {
                if (player.isValid) {
                    invSyncSnapshotsDB.delete(player.id);
                }
            }
        }
    } catch (e) {
        console.error(`[Paradox] Critical error clearing infrastructure databases: ${e}`);
    }

    dimensionChangingPlayers.clear();
    deadPlayers.clear();

    alertStaffSystem("§2[§7Paradox§2]§o§7 Volatile baseline inventory snapshots cleared successfully.");
}
