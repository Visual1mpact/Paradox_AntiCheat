import { PlayerLeaveBeforeEvent, system, world } from "@minecraft/server";
import { banlistDB } from "../event-listeners/world-initialize";
import { PacketReceivedBeforeEvent } from "@minecraft/server-net";
import { AsyncPlayerJoinBeforeEvent } from "@minecraft/server-admin";

/**
 * Reference to the server-net beforeEvents API.
 * Assigned dynamically during initialization.
 */
let serverNet: typeof import("@minecraft/server-net").beforeEvents;

/**
 * PacketId enum reference used to specify monitored packet types.
 */
let PacketId: typeof import("@minecraft/server-net").PacketId;

/**
 * Reference to server-admin beforeEvents API.
 */
let serverAdmin: typeof import("@minecraft/server-admin").beforeEvents;

/* ---------------- CONFIG ---------------- */

/** Time window (ms) to track recent packet violators. */
const VIOLATOR_WINDOW = 2000;

/** Number of recent violators required to trigger lockdown. */
const LOCKDOWN_THRESHOLD = 3;

/** Global packet limit within a short time window to detect server-wide bursts. */
const GLOBAL_PACKET_LIMIT = 200;

/** Time window (ms) for global packet burst detection. */
const GLOBAL_WINDOW = 1000;

/** Time window (ms) to track join attempts for anti-flood. */
const JOIN_WINDOW = 5000;

/** Maximum join attempts allowed per JOIN_WINDOW. */
const JOIN_LIMIT = 30;

/** Specific packet rate limits and time windows per packet type. */
const PACKET_LIMITS: Record<string, { limit: number; window: number }> = {
    MovePlayerPacket: { limit: 40, window: 1000 },
    TextPacket: { limit: 3, window: 2000 },
    CommandRequestPacket: { limit: 5, window: 1000 },
    EmotePacket: { limit: 5, window: 5000 },
};

/* ---------------------------------------- */

/**
 * Ring buffer for storing timestamps for rate-limiting.
 */
class TimestampBuffer {
    private buffer: number[];
    private start = 0;
    private count = 0;
    private maxSize: number;

    /**
     * Creates a TimestampBuffer with a fixed maximum size.
     * @param maxSize Maximum number of timestamps to store.
     */
    constructor(maxSize: number) {
        this.maxSize = maxSize;
        this.buffer = new Array<number>(maxSize);
    }

    /**
     * Adds a new timestamp to the buffer.
     * @param ts Timestamp in milliseconds.
     */
    push(ts: number) {
        const index = (this.start + this.count) % this.maxSize;
        this.buffer[index] = ts;

        if (this.count < this.maxSize) {
            this.count++;
        } else {
            this.start = (this.start + 1) % this.maxSize;
        }
    }

    /**
     * Removes timestamps older than the specified window.
     * @param now Current timestamp in milliseconds.
     * @param window Time window in milliseconds.
     */
    prune(now: number, window: number) {
        while (this.count > 0) {
            const ts = this.buffer[this.start];
            if (now - ts <= window) break;

            this.start = (this.start + 1) % this.maxSize;
            this.count--;
        }
    }

    /**
     * Returns the number of timestamps currently in the buffer.
     */
    size() {
        return this.count;
    }
}

/* ---------- TRACKING ---------- */

/** Stores per-player per-packet timestamp buffers. */
const packetLimits = new Map<string, Map<string, TimestampBuffer>>();

/** Global packet timestamp buffer for burst detection. */
const globalBuffer = new TimestampBuffer(GLOBAL_PACKET_LIMIT * 2);

/** List of recent violators for attack detection. */
const recentViolators: { name: string; timestamp: number }[] = [];

/** Array of recent join attempt timestamps. */
const joinAttempts: number[] = [];

/** Tracks the last packet type for each player. */
const lastPacketType = new Map<string, string>();

/** Indicates whether the server is currently in lockdown. */
let isLockedDown = false;

/** Timeout reference used to lift lockdown automatically. */
let lockdownTimeout: number | undefined;

/** Reference to the packet receive event handler for unsubscribing. */
let packetHandlerRef: (data: PacketReceivedBeforeEvent) => void;

/** Reference to the async player join event handler. */
let asyncJoinRef: (event: AsyncPlayerJoinBeforeEvent) => Promise<void>;

/** Reference to the player leave event handler. */
let playerLeaveRef: (event: PlayerLeaveBeforeEvent) => void;

/* ---------- LOCKDOWN ---------- */

/**
 * Triggers server lockdown due to excessive packet traffic or abuse.
 */
function triggerLockdown() {
    if (isLockedDown) return;

    isLockedDown = true;

    world.sendMessage("§o§c[Paradox] Network anomaly detected. Server entering lockdown.");

    lockdownTimeout = system.runTimeout(() => {
        isLockedDown = false;
        recentViolators.length = 0;

        world.sendMessage("§2[§7Paradox§2]§o§7 Lockdown lifted. Server is now open.");
    }, 1200);
}

/* ---------- INITIALIZE ---------- */

/**
 * Initializes packet handling, anti-spam, and join protection.
 * Dynamically imports server-net and server-admin modules.
 */
async function initializePacketHandler(): Promise<boolean | void> {
    try {
        const networkModule = await import("@minecraft/server-net");
        const adminModule = await import("@minecraft/server-admin");

        serverNet = networkModule.beforeEvents;
        PacketId = networkModule.PacketId;
        serverAdmin = adminModule.beforeEvents;
    } catch {
        return false;
    }

    /* ---------- JOIN PROTECTION ---------- */

    /**
     * Handles early join events to protect against join floods
     * and disconnect banned players.
     */
    asyncJoinRef = async (event) => {
        const now = Date.now();

        joinAttempts.push(now);

        while (joinAttempts.length && joinAttempts[0] < now - JOIN_WINDOW) {
            joinAttempts.shift();
        }

        if (joinAttempts.length > JOIN_LIMIT) {
            event.disconnect("Server busy. Try again later.");
            return;
        }

        const bannedPlayers = banlistDB.get("players") ?? {};
        isLockedDown = (world.getDynamicProperty("lockdown_b") as boolean) || false;

        if (isLockedDown) {
            event.disconnect("§o§7\n\nUnder Maintenance! Sorry for the inconvenience.");
            return;
        }

        if (event.name in bannedPlayers) {
            event.disconnect("§o§c[Paradox] You are banned from this server.");
        }
    };

    /* ---------- PACKET HANDLER ---------- */

    /**
     * Handles incoming packets to enforce per-player, per-packet,
     * and global rate limits, triggering lockdown or bans if abused.
     */
    packetHandlerRef = async (data) => {
        const player = data.sender;

        if (!player || !player.isValid) {
            data.cancel = true;
            return;
        }

        const playerName = player.name;
        const packetId = data.packetId;

        const now = Date.now();

        /* GLOBAL BURST DETECTION */
        globalBuffer.push(now);
        globalBuffer.prune(now, GLOBAL_WINDOW);

        if (globalBuffer.size() > GLOBAL_PACKET_LIMIT) {
            triggerLockdown();
        }

        /* PER-PACKET LIMITS */
        const config = PACKET_LIMITS[packetId];
        if (!config) return;

        let playerMap = packetLimits.get(playerName);
        if (!playerMap) {
            playerMap = new Map();
            packetLimits.set(playerName, playerMap);
        }

        let buffer = playerMap.get(packetId);
        if (!buffer) {
            buffer = new TimestampBuffer(config.limit * 2);
            playerMap.set(packetId, buffer);
        }

        buffer.push(now);
        buffer.prune(now, config.window);

        /* PACKET ROTATION DETECTION */
        const last = lastPacketType.get(playerName);
        if (last === packetId && buffer.size() > config.limit) {
            data.cancel = true;
        }

        lastPacketType.set(playerName, packetId);

        if (buffer.size() > config.limit) {
            data.cancel = true;

            recentViolators.push({ name: playerName, timestamp: now });

            const cutoff = now - VIOLATOR_WINDOW;
            while (recentViolators.length && recentViolators[0].timestamp < cutoff) {
                recentViolators.shift();
            }

            if (recentViolators.length >= LOCKDOWN_THRESHOLD) {
                triggerLockdown();
            }

            const bannedPlayers = banlistDB.get("players") ?? {};
            if (!(playerName in bannedPlayers)) {
                bannedPlayers[playerName] = {
                    reason: "Packet rate abuse",
                    bannedBy: "System",
                    timestamp: now,
                };
                await banlistDB.set("players", bannedPlayers);
            }

            packetLimits.delete(playerName);

            world.sendMessage(`§2[§7Paradox§2]§o§7 ${playerName} triggered rate-limiting.`);

            system.run(() => {
                if (player.isValid) {
                    player.runCommand(`kick @s Packet spam detected.`);
                }
            });
        }
    };

    /**
     * Cleans up tracking data when a player leaves the server.
     */
    playerLeaveRef = (event) => {
        packetLimits.delete(event.player.name);
        lastPacketType.delete(event.player.name);
    };

    // Subscribe to monitored packet types
    serverNet.packetReceive.subscribe(packetHandlerRef, {
        monitoredPacketIds: [PacketId.CommandRequestPacket, PacketId.LegacyTelemetryEventPacket, PacketId.TextPacket, PacketId.EmotePacket, PacketId.MovePlayerPacket],
    });

    serverAdmin.asyncPlayerJoin.subscribe(asyncJoinRef);
    world.beforeEvents.playerLeave.subscribe(playerLeaveRef);
}

/* ---------- START ---------- */

/**
 * Starts packet handler system, including join protection and rate limiting.
 * @returns True if initialization succeeded.
 */
export async function startPacketHandler(): Promise<boolean> {
    const success = await initializePacketHandler();
    return success === false ? false : true;
}

/* ---------- STOP ---------- */

/**
 * Stops all packet monitoring and join protections, clears tracking data.
 */
export function stopPacketHandler(): void {
    if (serverNet && packetHandlerRef) {
        serverNet.packetReceive.unsubscribe(packetHandlerRef);
    }

    if (serverAdmin && asyncJoinRef) {
        serverAdmin.asyncPlayerJoin.unsubscribe(asyncJoinRef);
    }

    if (playerLeaveRef) {
        world.beforeEvents.playerLeave.unsubscribe(playerLeaveRef);
    }

    packetLimits.clear();
    lastPacketType.clear();
    recentViolators.length = 0;

    if (lockdownTimeout !== undefined) {
        system.clearRun(lockdownTimeout);
        lockdownTimeout = undefined;
    }

    isLockedDown = false;
}
