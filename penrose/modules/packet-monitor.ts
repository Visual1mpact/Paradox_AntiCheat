import { system } from "@minecraft/server";
import type { beforeEvents as BeforeEventsType } from "@minecraft/server-net";

// Declare types for dynamically imported modules
let beforeEvents: typeof BeforeEventsType;

/**
 * Structure to track individual player's packet activity.
 */
type PlayerPacketCount = {
    count: number;
    firstOccurrence: number;
};

// Memory stores for packet activity and warning cooldowns
const packetFrequency: Record<string, Record<string, PlayerPacketCount>> = {};
const lastWarning: Record<string, number> = {};

// Constants for spam detection and cleanup
const SPAM_THRESHOLD = 250; // Max allowed packets within TIME_WINDOW
const TIME_WINDOW = 5000; // 5 seconds in milliseconds
const CLEANUP_INTERVAL_TICKS = 1200; // 60 seconds at 20 ticks per second

// Packets to ignore during monitoring
const IGNORED_PACKETS = new Set<string>(["PlayerAuthInputPacket", "SubChunkRequestPacket", "ClientCacheBlobStatusPacket"]);

// Interval ID for scheduled cleanup
let cleanupTaskId: number | undefined;

/**
 * Tracks and evaluates packet frequency to detect spammy behavior.
 *
 * @param packetId - The identifier of the packet being received.
 * @param playerName - The name of the player who sent the packet.
 */
const checkPacketSpam = (packetId: string, playerName: string): void => {
    const currentTime = Date.now();

    // Initialize packet entry for this packetId and playerName if needed
    if (!packetFrequency[packetId]) {
        packetFrequency[packetId] = {};
    }

    if (!packetFrequency[packetId][playerName]) {
        packetFrequency[packetId][playerName] = { count: 1, firstOccurrence: currentTime };
        return;
    }

    const data = packetFrequency[packetId][playerName];

    // Increment count or reset if outside time window
    if (currentTime - data.firstOccurrence <= TIME_WINDOW) {
        data.count++;
    } else {
        packetFrequency[packetId][playerName] = { count: 1, firstOccurrence: currentTime };
    }

    // Check if the player exceeded the spam threshold
    if (data.count > SPAM_THRESHOLD) {
        const key = playerName + packetId;
        const lastTime = lastWarning[key] ?? 0;

        if (currentTime - lastTime > TIME_WINDOW) {
            console.warn(`[Paradox] Potential spam detected for packet: ${packetId} | Count: ${data.count} | Player: ${playerName}`);
            lastWarning[key] = currentTime;
        }
    }
};

/**
 * Callback triggered when a packet is received from a player.
 *
 * @param event - The event containing packet and sender info.
 */
const packetReceiveCallback = (event: import("@minecraft/server-net").PacketReceivedBeforeEvent): void => {
    const packetId = event.packetId;
    const playerName = event.sender?.isValid ? event.sender.name : "Unknown";

    // Skip ignored packets
    if (IGNORED_PACKETS.has(packetId)) return;

    checkPacketSpam(packetId, playerName);
};

/**
 * Periodic memory cleanup to prevent long-term memory growth.
 * Removes stale packet data and old warning timestamps.
 */
const runCleanup = (): void => {
    const now = Date.now();

    // Cleanup old entries in packetFrequency
    for (const packetId in packetFrequency) {
        for (const playerName in packetFrequency[packetId]) {
            const data = packetFrequency[packetId][playerName];
            if (now - data.firstOccurrence > TIME_WINDOW) {
                delete packetFrequency[packetId][playerName];
            }
        }

        // Remove empty packetId entries
        if (Object.keys(packetFrequency[packetId]).length === 0) {
            delete packetFrequency[packetId];
        }
    }

    // Cleanup old entries in lastWarning
    for (const key in lastWarning) {
        if (now - lastWarning[key] > TIME_WINDOW) {
            delete lastWarning[key];
        }
    }
};

/**
 * Starts the packet listener and memory cleanup interval.
 *
 * @returns A promise resolving to true if the listener was initialized, false otherwise.
 */
export async function startPacketListener(): Promise<boolean> {
    const networkModule: typeof import("@minecraft/server-net") | null = await import("@minecraft/server-net").catch((error: Error): null => {
        console.warn("[Paradox] Failed to load @minecraft/server-net module. Packet spam detection not initialized.", error);
        return null;
    });

    if (!networkModule) return false;

    beforeEvents = networkModule.beforeEvents;

    beforeEvents.packetReceive.subscribe(packetReceiveCallback);

    // Start cleanup task if not already running
    if (cleanupTaskId === undefined) {
        cleanupTaskId = system.runInterval(runCleanup, CLEANUP_INTERVAL_TICKS);
    }

    console.log("[Paradox] Packet spam detection initialized. Monitoring packets.");
    return true;
}

/**
 * Stops the packet listener and clears memory cleanup interval.
 */
export function stopPacketListener(): void {
    if (beforeEvents) {
        beforeEvents.packetReceive.unsubscribe(packetReceiveCallback);
        console.log("[Paradox] Packet spam detection stopped.");
    } else {
        console.warn("[Paradox] Packet listener was not initialized.");
    }

    if (cleanupTaskId !== undefined) {
        system.clearRun(cleanupTaskId);
        cleanupTaskId = undefined;
    }
}
