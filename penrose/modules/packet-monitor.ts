import type { beforeEvents as BeforeEventsType } from "@minecraft/server-net";

// Declare types for dynamically imported modules
let beforeEvents: typeof BeforeEventsType;

type PlayerPacketCount = {
    count: number;
    firstOccurrence: number;
};

const packetFrequency: Record<string, Record<string, PlayerPacketCount>> = {}; // Organized by packetId and playerName
const SPAM_THRESHOLD = 50; // Adjust threshold as needed.
const TIME_WINDOW = 10000; // 10 seconds in milliseconds.
const IGNORED_PACKETS = new Set<string>(["PlayerAuthInputPacket", "SubChunkRequestPacket", "ClientCacheBlobStatusPacket"]); // Add packet IDs to ignore here.

/**
 * Check for packet spam by monitoring the frequency of received packets.
 * @param packetId The ID of the packet to monitor.
 * @param playerName The name of the player who sent the packet.
 */
const checkPacketSpam = (packetId: string, playerName: string) => {
    const currentTime = Date.now();

    if (!packetFrequency[packetId]) {
        packetFrequency[packetId] = {};
    }

    if (!packetFrequency[packetId][playerName]) {
        packetFrequency[packetId][playerName] = { count: 1, firstOccurrence: currentTime };
    } else {
        const playerPacketData = packetFrequency[packetId][playerName];
        if (currentTime - playerPacketData.firstOccurrence <= TIME_WINDOW) {
            playerPacketData.count++;
        } else {
            packetFrequency[packetId][playerName] = { count: 1, firstOccurrence: currentTime };
        }

        if (playerPacketData.count > SPAM_THRESHOLD) {
            console.warn(`Paradox: Potential spam detected for packet: ${packetId} | Count: ${playerPacketData.count} | Player: ${playerName}`);
        }
    }
};

/**
 * Callback for handling packet reception events.
 * @param event The packet received event.
 */
const packetReceiveCallback = (event: import("@minecraft/server-net").PacketReceivedBeforeEvent) => {
    const packetId = event.packetId;
    const playerName = event.sender?.name ?? "Unknown";

    if (IGNORED_PACKETS.has(packetId)) {
        return; // Ignore specified packets.
    }

    checkPacketSpam(packetId, playerName);
};

/**
 * Initialize and start the packet listener by dynamically importing
 * the @minecraft/server-net module and subscribing to packet receive events.
 *
 * @returns {Promise<boolean>} Resolves to `true` if the listener is initialized successfully, `false` otherwise.
 */
export async function startPacketListener(): Promise<boolean> {
    // Dynamically import @minecraft/server-net and ensure proper typing
    const networkModule: typeof import("@minecraft/server-net") | null = await import("@minecraft/server-net").catch((error: Error): null => {
        console.warn("Failed to load @minecraft/server-net module. Packet spam detection not initialized.", error);
        return null;
    });

    if (!networkModule) return false; // Exit early if the module is unavailable

    beforeEvents = networkModule.beforeEvents;

    beforeEvents.packetReceive.subscribe(packetReceiveCallback);
    console.log("Paradox: Packet spam detection initialized. Monitoring packets.");

    return true;
}

/**
 * Stops the packet listener by unsubscribing from packet receive events.
 *
 * @returns {void}
 */
export function stopPacketListener(): void {
    if (beforeEvents) {
        beforeEvents.packetReceive.unsubscribe(packetReceiveCallback);
        console.log("Paradox: Packet spam detection stopped.");
    } else {
        console.warn("Paradox: Packet listener was not initialized.");
    }
}
