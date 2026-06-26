import { system, Player, PlayerJoinAfterEvent, PlayerLeaveBeforeEvent, PlayerSpawnAfterEvent } from "@minecraft/server";
import { invSyncSnapshotsDB, invSyncAuditDB } from "../event-listeners/world-initialize";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { PlayerCache } from "../classes/player-cache";
import { EventCoordinator } from "../classes/event-coordinator";

/**
 * CONFIGURATION
 */
const JOIN_DELAY_TICKS = 20; // ~1 second after join
const MAX_AUDIT_EVENTS = 200;
const SNAPSHOT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ITEM_TOLERANCE = 0; // tolerance per item type
const CLEANUP_FREQUENCY_TICKS = 100; // How often to scan database expiration states

/**
 * RUNTIME LIFECYCLE FLAGS
 */
let isModuleActive = false;
let isJobActive = false;

let joinSub: ((arg: PlayerJoinAfterEvent) => void) | undefined;
let leaveSub: ((arg: PlayerLeaveBeforeEvent) => void) | undefined;
let respawnSub: ((arg: PlayerSpawnAfterEvent) => void) | undefined;

const pendingJoinChecks = new Map<string, number>();
let lastCleanupTick = 0;

/**
 * Stored inventory snapshot structure.
 */
interface InvSyncSnapshot {
    counts: Record<string, number>;
    time: number;
    name: string;
}

/**
 * INVENTORY COUNTS UTILITY
 */
function getInventoryCounts(player: Player): Record<string, number> | null {
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
 * Continuous generator loop running background tasks on a frame-by-frame basis.
 */
function* continuousInvSyncLoop(): Generator<void, void, unknown> {
    if (isJobActive) return;
    isJobActive = true;

    try {
        if (!isModuleActive) return;

        const currentTick = system.currentTick;

        // TASK 1: PROCESS PENDING DELAYED JOIN CHECKS
        if (pendingJoinChecks.size > 0) {
            for (const [playerId, scheduledTick] of pendingJoinChecks) {
                if (currentTick >= scheduledTick) {
                    const player = PlayerCache.getPlayerById(playerId);

                    const isValid = player?.isValid;
                    if (isValid) {
                        try {
                            checkPlayerInventory(player);
                        } catch (e) {
                            console.error(`[Paradox] Error verifying join snapshot: ${e}`);
                        }
                    }
                    pendingJoinChecks.delete(playerId);
                }
                yield;
            }
        }

        // TASK 2: THROTTLED EXPIRED SNAPSHOT CLEANUP
        if (currentTick - lastCleanupTick >= CLEANUP_FREQUENCY_TICKS) {
            lastCleanupTick = currentTick;
            try {
                invSyncSnapshotsDB.clean((_: string | number, value: InvSyncSnapshot) => Date.now() - value.time < SNAPSHOT_EXPIRY_MS, { silent: true });
            } catch (e) {
                console.error(`[Paradox] Error cleaning expired DB snapshots: ${e}`);
            }
            yield;
        }
    } catch (e) {
        console.error(`[Paradox] Error during continuous invSync loop pass: ${e}`);
    } finally {
        isJobActive = false;

        // Seamlessly recurse to loop the tasks on the next available engine frame
        if (isModuleActive) {
            system.run(() => {
                system.runJob(continuousInvSyncLoop());
            });
        }
    }
}

/**
 * PLAYER JOIN / LEAVE / RESPAWN EVENT ROUTERS
 */
function onPlayerJoin(event: PlayerJoinAfterEvent) {
    pendingJoinChecks.set(event.playerId, system.currentTick + JOIN_DELAY_TICKS);
}

function onPlayerLeave(event: PlayerLeaveBeforeEvent) {
    const player = event.player;
    if (!player) return;

    const counts = getInventoryCounts(player);
    if (!counts) return;

    try {
        invSyncSnapshotsDB.set(player.id, {
            counts,
            time: Date.now(),
            name: player.name,
        });
    } catch (e) {
        console.error(`[Paradox] Failed to write leave snapshot for ${player.name}: ${e}`);
    }
}

function onPlayerRespawn(event: PlayerSpawnAfterEvent) {
    const player = event.player;
    const isValid = player.isValid;
    if (!isValid) return;

    try {
        checkPlayerInventory(player);
    } catch (e) {
        console.error(`[Paradox] Failed to process respawn check for ${player.name}: ${e}`);
    }
}

/**
 * INVENTORY SYNCHRONIZATION AND VERIFICATION
 */
function checkPlayerInventory(player: Player) {
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
        const delta = current[item] - (snapshot.counts[item] ?? 0);

        if (delta > ITEM_TOLERANCE) {
            excess[item] = delta;
            totalExcess += delta;
        }
    }

    if (totalExcess > 0) {
        console.log(`[InvSync] Snapshot anomaly detected for ${player.name}: +${totalExcess} items`);
        handleAnomaly(player, excess, totalExcess);
    }

    snapshot.counts = current;
    snapshot.time = Date.now();
    invSyncSnapshotsDB.set(player.id, snapshot);
}

/**
 * HANDLING FOUND ANOMALIES
 */
function handleAnomaly(player: Player, excess: Record<string, number>, totalExcess: number) {
    const snapshotClone = JSON.parse(JSON.stringify(excess));

    player.sendMessage(`§2[§7Paradox§2]§o§7 §cInventory anomaly detected: §e${totalExcess} §cexcess items.`);

    removeExcessItems(player, excess);

    const audit = invSyncAuditDB.get(player.id) ?? { events: [] };
    audit.events.push({
        time: Date.now(),
        excessItems: snapshotClone,
        totalExcess,
    });

    if (audit.events.length > MAX_AUDIT_EVENTS) {
        audit.events = audit.events.slice(-MAX_AUDIT_EVENTS);
    }
    invSyncAuditDB.set(player.id, audit);

    alertStaff(player, totalExcess);
}

/**
 * REMOVE EXCESS ITEMS FROM INVENTORY CONTAINER
 */
function removeExcessItems(player: Player, excess: Record<string, number>) {
    const container = player.getComponent("inventory")?.container;
    if (!container) return;

    let remainingExcess = Object.values(excess).reduce((sum, v) => sum + v, 0);
    if (remainingExcess <= 0) return;

    for (let i = 0; i < container.size; i++) {
        if (remainingExcess <= 0) break;

        try {
            const item = container.getItem(i);
            if (!item) continue;

            const type = item.typeId;
            const amount = excess[type];
            if (!amount) continue;

            if (item.amount <= amount) {
                container.setItem(i, undefined);
                remainingExcess -= item.amount;
                excess[type] = 0;
            } else {
                item.amount -= amount;
                container.setItem(i, item);
                remainingExcess -= amount;
                excess[type] = 0;
            }

            if (excess[type] <= 0) delete excess[type];
        } catch {
            continue;
        }
    }
}

/**
 * STAFF NOTIFICATION SYSTEMS
 */
function alertStaff(player: Player, totalExcess: number) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        const isStaffValid = s.isValid;
        if (!isStaffValid || s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[InvSync] §f${player.name} §7Excess: §e${totalExcess}`);
    }
}

function alertStaffSystem(message: string) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        const isStaffValid = s.isValid;
        if (isStaffValid) s.sendMessage(`§2[§7Paradox§2]§o§7 ${message}`);
    }
}

/**
 * LIFECYCLE MANAGEMENT INTERFACES
 */
export function startInvSync() {
    if (isModuleActive) return;
    isModuleActive = true;

    joinSub = onPlayerJoin;
    leaveSub = onPlayerLeave;
    respawnSub = onPlayerRespawn;

    EventCoordinator.subscribeAfter("playerJoin", joinSub);
    EventCoordinator.subscribeBefore("playerLeave", leaveSub);
    EventCoordinator.subscribeAfter("playerSpawn", respawnSub);

    // Initial instant setup snapshot loop for any active players currently online
    for (const player of PlayerCache.getPlayers()) {
        const isValid = player.isValid;
        if (isValid) {
            const counts = getInventoryCounts(player);
            if (counts) {
                invSyncSnapshotsDB.set(player.id, {
                    counts,
                    time: Date.now(),
                    name: player.name,
                });
            }
        }
    }

    if (!isJobActive) {
        system.runJob(continuousInvSyncLoop());
    }
    alertStaffSystem("§2[§7Paradox§2]§o§7 InvSync module §astarted§7.");
}

export function stopInvSync() {
    if (!isModuleActive) return;
    isModuleActive = false;

    if (joinSub) EventCoordinator.unsubscribeAfter("playerJoin", joinSub);
    if (leaveSub) EventCoordinator.unsubscribeBefore("playerLeave", leaveSub);
    if (respawnSub) EventCoordinator.unsubscribeAfter("playerSpawn", respawnSub);

    joinSub = leaveSub = respawnSub = undefined;
    pendingJoinChecks.clear();

    alertStaffSystem("§2[§7Paradox§2]§o§7 InvSync module §4stopped§7.");
}

/**
 * MANUAL INTERACTION OPERATIONS
 */
export function forceCheckAll() {
    for (const player of PlayerCache.getPlayers()) {
        const isValid = player.isValid;
        if (isValid) checkPlayerInventory(player);
    }
}

export function clearAllSnapshots() {
    invSyncSnapshotsDB.clear();
    invSyncAuditDB.clear();
}

export function forceSnapshotAll() {
    for (const player of PlayerCache.getPlayers()) {
        const isValid = player.isValid;
        if (isValid) {
            const counts = getInventoryCounts(player);
            if (counts) {
                invSyncSnapshotsDB.set(player.id, {
                    counts,
                    time: Date.now(),
                    name: player.name,
                });
            }
        }
    }
}
