import { world, system, Player, PlayerJoinAfterEvent, PlayerLeaveBeforeEvent, PlayerSpawnAfterEvent } from "@minecraft/server";
import { invSyncSnapshotsDB, invSyncAuditDB } from "../event-listeners/world-initialize";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";
import { PlayerCache } from "../classes/player-cache";

/**
 * CONFIGURATION
 */
const JOIN_DELAY_TICKS = 20; // ~1 second after join
const MAX_AUDIT_EVENTS = 200;
const SNAPSHOT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ITEM_TOLERANCE = 0; // tolerance per item type

/**
 * RUNTIME STATE
 */
let running = false;
let joinSub: any = null;
let leaveSub: any = null;
let respawnSub: any = null;
let intervalId: any = null;
const pendingJoinChecks = new Map<string, number>();

/**
 * Stored inventory snapshot structure.
 */
interface InvSyncSnapshot {
    counts: Record<string, number>;
    time: number;
    name: string;
}

/**
 * START / STOP
 */
export async function startInvSync() {
    if (running) return;
    running = true;

    joinSub = world.afterEvents.playerJoin.subscribe(onPlayerJoin);
    leaveSub = world.beforeEvents.playerLeave.subscribe(onPlayerLeave);
    respawnSub = world.afterEvents.playerSpawn.subscribe(onPlayerRespawn);

    intervalId = system.runInterval(tickLoop, 100); // cleanup expired snapshots

    await snapshotAllPlayers();
    alertStaffSystem("§2[§7Paradox§2]§o§7 InvSync module §astarted§7.");
}

export function stopInvSync() {
    if (!running) return;
    running = false;

    if (joinSub) world.afterEvents.playerJoin.unsubscribe(joinSub);
    if (leaveSub) world.beforeEvents.playerLeave.unsubscribe(leaveSub);
    if (respawnSub) world.afterEvents.playerSpawn.unsubscribe(respawnSub);
    if (intervalId) system.clearRun(intervalId);

    joinSub = leaveSub = respawnSub = intervalId = null;
    pendingJoinChecks.clear();
    alertStaffSystem("§2[§7Paradox§2]§o§7 §cInvSync module stopped.");
}

/**
 * MAIN LOOP
 */
async function tickLoop() {
    if (!running) return;
    await processPendingJoins();
    await cleanExpiredSnapshots();
}

/**
 * PLAYER JOIN / LEAVE / RESPAWN
 */
function onPlayerJoin(event: PlayerJoinAfterEvent) {
    pendingJoinChecks.set(event.playerId, system.currentTick + JOIN_DELAY_TICKS);
}

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

async function onPlayerRespawn(event: PlayerSpawnAfterEvent) {
    const player = event.player;
    await checkPlayerInventory(player);
}

/**
 * PROCESS DELAYED JOIN CHECKS
 */
async function processPendingJoins() {
    const currentTick = system.currentTick;

    for (const [playerId, scheduledTick] of pendingJoinChecks) {
        if (currentTick >= scheduledTick) {
            const player = PlayerCache.getPlayerById(playerId);
            if (player) await checkPlayerInventory(player);
            pendingJoinChecks.delete(playerId);
        }
    }
}

/**
 * SNAPSHOT MANAGEMENT
 */
export async function snapshotAllPlayers() {
    for (const player of PlayerCache.getPlayers()) {
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
 * CLEAN EXPIRED SNAPSHOTS
 */
async function cleanExpiredSnapshots() {
    await invSyncSnapshotsDB.clean((_: string | number, value: InvSyncSnapshot) => Date.now() - value.time < SNAPSHOT_EXPIRY_MS, { silent: true });
}

/**
 * INVENTORY CHECK
 * Only compares current inventory against last snapshot.
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
        const delta = current[item] - (snapshot.counts[item] ?? 0);

        if (delta > ITEM_TOLERANCE) {
            excess[item] = delta;
            totalExcess += delta;
        }
    }

    if (totalExcess > 0) {
        console.log(`[InvSync] Snapshot anomaly detected for ${player.name}: +${totalExcess} items`);
        await handleAnomaly(player, excess, totalExcess);
    }

    snapshot.counts = current;
    snapshot.time = Date.now();
    await invSyncSnapshotsDB.set(player.id, snapshot);
}

/**
 * HANDLE ANOMALY
 */
async function handleAnomaly(player: Player, excess: Record<string, number>, totalExcess: number) {
    const snapshot = JSON.parse(JSON.stringify(excess));

    player.sendMessage(`§2[§7Paradox§2]§o§7 §cInventory anomaly detected: §e${totalExcess} §cexcess items.`);

    removeExcessItems(player, excess);

    const audit = invSyncAuditDB.get(player.id) ?? { events: [] };
    audit.events.push({
        time: Date.now(),
        excessItems: snapshot,
        totalExcess,
    });
    if (audit.events.length > MAX_AUDIT_EVENTS) {
        audit.events = audit.events.slice(-MAX_AUDIT_EVENTS);
    }
    await invSyncAuditDB.set(player.id, audit);

    alertStaff(player, totalExcess);
}

/**
 * STAFF ALERTS
 */
function alertStaff(player: Player, totalExcess: number) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[InvSync] §f${player.name} §7Excess: §e${totalExcess}`);
    }
}

function alertStaffSystem(message: string) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) s.sendMessage(`§2[§7Paradox§2]§o§7 ${message}`);
}

/**
 * REMOVE EXCESS ITEMS
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
    }
}

/**
 * INVENTORY COUNTS
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

/**
 * COMMAND HELPERS
 */
export async function forceCheckAll() {
    for (const player of PlayerCache.getPlayers()) await checkPlayerInventory(player);
}
export async function clearAllSnapshots() {
    await invSyncSnapshotsDB.clear();
    await invSyncAuditDB.clear();
}
export async function forceSnapshotAll() {
    await snapshotAllPlayers();
}
