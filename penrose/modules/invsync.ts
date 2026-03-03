// modules/invsync.ts

import { world, system, Player, PlayerInventoryItemChangeAfterEvent } from "@minecraft/server";
import { invSyncSnapshotsDB, invSyncAuditDB } from "../event-listeners/world-initialize";
import { getSecurityClearanceLevel4Players } from "../utility/level-4-security-tracker";

const SNAPSHOT_INTERVAL_TICKS = 100; // ~5 seconds
const JOIN_DELAY_TICKS = 20; // ~1 second
const MAX_AUDIT_EVENTS = 200;
const SNAPSHOT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ITEM_TOLERANCE = 0;

let running = false;
let joinSub: any = null;
let leaveSub: any = null;
let inventoryChangeSub: any = null;
let intervalId: any = null;
const pendingJoinChecks = new Map<string, number>();

interface InvSyncSnapshot {
    counts: Record<string, number>;
    time: number;
    name: string;
    suspicionScore: number;
}

/* ===========================
   START / STOP
=========================== */

export async function startInvSync() {
    if (running) return;
    running = true;

    // Subscribe to player join/leave events
    joinSub = world.afterEvents.playerJoin.subscribe(onPlayerJoin);
    leaveSub = world.afterEvents.playerLeave.subscribe(onPlayerLeave);

    // Subscribe to inventory change events (slot-level, real-time)
    inventoryChangeSub = world.afterEvents.playerInventoryItemChange.subscribe(onInventoryChange);

    // Periodic tick for cleanup, join processing, and optional snapshot backup
    intervalId = system.runInterval(tickLoop, SNAPSHOT_INTERVAL_TICKS);

    // Initial snapshot of all online players
    await snapshotAllPlayers();

    alertStaffSystem("§2[§7Paradox§2]§o§7 §aInvSync module started.");
}

export function stopInvSync() {
    if (!running) return;
    running = false;

    if (joinSub) world.afterEvents.playerJoin.unsubscribe(joinSub);
    if (leaveSub) world.afterEvents.playerLeave.unsubscribe(leaveSub);
    if (inventoryChangeSub) world.afterEvents.playerInventoryItemChange.unsubscribe(inventoryChangeSub);
    if (intervalId) system.clearRun(intervalId);

    joinSub = null;
    leaveSub = null;
    inventoryChangeSub = null;
    intervalId = null;

    alertStaffSystem("§2[§7Paradox§2]§o§7 §cInvSync module stopped.");
}

/* ===========================
   TICK LOOP
=========================== */

async function tickLoop() {
    if (!running) return;

    await processPendingJoins();
    await cleanExpiredSnapshots();
    // Optional: periodic backup snapshot
    // await snapshotAllPlayers();
}

/* ===========================
   SNAPSHOT LOGIC
=========================== */

export async function forceSnapshotAll() {
    await snapshotAllPlayers();
}

async function snapshotAllPlayers() {
    for (const player of world.getPlayers()) {
        const counts = getInventoryCounts(player);
        if (!counts) continue;

        const saved = invSyncSnapshotsDB.get(player.id);
        await invSyncSnapshotsDB.set(player.id, {
            counts,
            time: Date.now(),
            name: player.name,
            suspicionScore: saved?.suspicionScore ?? 0,
        });
    }
}

function onPlayerLeave(event: any) {
    const player = event.player;
    if (!player) return;

    const counts = getInventoryCounts(player);
    if (!counts) return;

    const saved = invSyncSnapshotsDB.get(player.id);
    invSyncSnapshotsDB.set(player.id, {
        counts,
        time: Date.now(),
        name: player.name,
        suspicionScore: saved?.suspicionScore ?? 0,
    });
}

/* ===========================
   JOIN CHECK LOGIC
=========================== */

function onPlayerJoin(event: any) {
    const player = event.player;
    pendingJoinChecks.set(player.id, system.currentTick + JOIN_DELAY_TICKS);
}

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

export async function forceCheckAll() {
    for (const player of world.getPlayers()) {
        await checkPlayerInventory(player);
    }
}

/* ===========================
   EVENT-DRIVEN INVENTORY CHANGE
=========================== */

async function onInventoryChange(event: PlayerInventoryItemChangeAfterEvent) {
    const player = event.player;

    const itemId = event.itemStack?.typeId ?? null;
    if (!itemId) return;

    const snapshot: InvSyncSnapshot = invSyncSnapshotsDB.get(player.id) ?? {
        counts: {},
        time: Date.now(),
        name: player.name,
        suspicionScore: 0,
    };

    const oldAmount = snapshot.counts[itemId] ?? 0;
    const newAmount = event.itemStack?.amount ?? 0;
    const diff = newAmount - oldAmount;

    if (diff > ITEM_TOLERANCE) {
        const excess: Record<string, number> = {};
        excess[itemId] = diff;
        await handleAnomaly(player, excess, diff, snapshot);
    }

    // Update snapshot for this slot/item only
    snapshot.counts[itemId] = newAmount;
    snapshot.time = Date.now();
    await invSyncSnapshotsDB.set(player.id, snapshot);
}

/* ===========================
   INVENTORY CHECK / ANOMALY
=========================== */

async function checkPlayerInventory(player: Player) {
    const saved = invSyncSnapshotsDB.get(player.id);
    if (!saved) return;

    const current = getInventoryCounts(player);
    if (!current) return;

    const excess: Record<string, number> = {};
    let totalExcess = 0;

    for (const item in current) {
        const diff = current[item] - (saved.counts[item] ?? 0);
        if (diff > ITEM_TOLERANCE) {
            excess[item] = diff;
            totalExcess += diff;
        }
    }

    if (totalExcess > 0) {
        await handleAnomaly(player, excess, totalExcess, saved);
    }
}

/* ===========================
   ANOMALY HANDLING
=========================== */

async function handleAnomaly(player: Player, excess: Record<string, number>, totalExcess: number, snapshot: InvSyncSnapshot) {
    player.sendMessage(`§2[§7Paradox§2]§o§7 §cInventory anomaly detected: §e${totalExcess} §cexcess items.`);

    removeExcessItems(player, excess);

    const suspicionScore = snapshot.suspicionScore + totalExcess;
    await invSyncSnapshotsDB.set(player.id, { ...snapshot, suspicionScore });

    const audit = invSyncAuditDB.get(player.id) ?? { events: [] };
    audit.events.push({ time: Date.now(), excessItems: excess, totalExcess });

    if (audit.events.length > MAX_AUDIT_EVENTS) {
        audit.events = audit.events.slice(-MAX_AUDIT_EVENTS);
    }

    await invSyncAuditDB.set(player.id, audit);
    alertStaff(player, totalExcess, suspicionScore);
}

function alertStaff(player: Player, totalExcess: number, suspicionScore: number) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        if (s.id === player.id) continue;
        s.sendMessage(`§2[§7Paradox§2]§o§7 §e[InvSync] §f${player.name} §7Excess: §e${totalExcess} §8| §7Suspicion: §c${suspicionScore}`);
    }
}

function alertStaffSystem(message: string) {
    const staff = getSecurityClearanceLevel4Players();
    for (const s of staff) {
        s.sendMessage(`§2[§7Paradox§2]§o§7 ${message}`);
    }
}

function removeExcessItems(player: Player, excess: Record<string, number>) {
    const container = player.getComponent("inventory")?.container;
    if (!container) return;

    for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;

        const type = item.typeId;
        const excessAmount = excess[type];
        if (!excessAmount) continue;

        if (item.amount <= excessAmount) {
            container.setItem(i, undefined);
            excess[type] -= item.amount;
        } else {
            item.amount -= excessAmount;
            container.setItem(i, item);
            excess[type] = 0;
        }

        if (excess[type] <= 0) delete excess[type];
    }
}

/* ===========================
   SNAPSHOT CLEANUP / CLEAR
=========================== */

async function cleanExpiredSnapshots() {
    await invSyncSnapshotsDB.clean((_: string, value: InvSyncSnapshot) => Date.now() - value.time < SNAPSHOT_EXPIRY_MS);
}

export async function clearAllSnapshots() {
    await invSyncSnapshotsDB.clear();
    await invSyncAuditDB.clear();
}

/* ===========================
   UTILITY
=========================== */

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
