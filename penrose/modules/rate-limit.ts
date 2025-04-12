import { PlayerLeaveBeforeEvent, system, world } from "@minecraft/server";

// Declare types for dynamically imported modules
let beforeEvents: typeof import("@minecraft/server-net").beforeEvents;
let PacketId: typeof import("@minecraft/server-net").PacketId;

// Maps to track packet counts and player bans
const packetLimits = new Map(); // Stores the packets sent by each player
const startIndices = new Map(); // Tracks the start index for packet timestamps to enforce rate-limiting

// Callbacks for handling packet reception and player leave events
let packetReceiveCallback: (data: import("@minecraft/server-net").PacketReceivedBeforeEvent) => void;
let playerLeaveCallback: (event: PlayerLeaveBeforeEvent) => void;

/**
 * Initialize the packet handler, dynamically importing the network module
 * and setting up the packet receive and player leave event listeners.
 *
 * This function handles rate-limiting of network packets by each player.
 * Players who exceed a packet sending threshold are banned.
 */
async function initializePacketHandler(): Promise<boolean | void> {
    try {
        // Dynamically import the @minecraft/server-net module to access the beforeEvents and PacketId
        const networkModule = await import("@minecraft/server-net");
        beforeEvents = networkModule.beforeEvents;
        PacketId = networkModule.PacketId;
    } catch (error) {
        // Return early if the module cannot be imported
        return false;
    }

    // Define the packet receive callback to check for rate-limiting violations
    packetReceiveCallback = (data) => {
        const { sender: player } = data;

        // Safely parse the bannedPlayers
        const bannedPlayers: string[] = JSON.parse((world.getDynamicProperty("bannedPlayers") as string) ?? "[]");

        // Ensure the player exists and is not banned
        if (!player) {
            data.cancel = true; // Cancel if player is undefined
            return;
        }
        if (bannedPlayers.includes(player.name)) {
            const reason = "You are banned";
            data.cancel = true; // Cancel the packet reception
            system.run(() => {
                if (player.isValid) {
                    player.runCommand(`kick @s §o§7\n\n${reason}`);
                }
            });
            return;
        }

        const now = Date.now();
        const packetsSent = packetLimits.get(player) ?? []; // Retrieve the player's sent packets (or empty array if none)
        let startIndex = startIndices.get(player) ?? 0; // Get the starting index of packets for the player

        // Clean up old packet timestamps that are outside the 200ms window
        while (startIndex < packetsSent.length && packetsSent[startIndex] <= now - 200) {
            startIndex++;
        }

        // Record the timestamp for the current packet
        packetsSent.push(now);

        // Check if the player has sent more than 5 packets in 200ms, indicating a rate-limit violation
        if (packetsSent.length - startIndex > 5) {
            data.cancel = true; // Cancel the packet reception
            const reason = "Using a client to crash";
            bannedPlayers.push(player.name);
            world.setDynamicProperty("bannedPlayers", JSON.stringify(bannedPlayers));
            packetLimits.delete(player); // Clear the packet data for the player
            startIndices.delete(player); // Clear the start index for the player
            world.sendMessage(`§2[§7Paradox§2]§o§7 ${player.name} attempted to run a crasher!`); // Notify the server of the attempted crash
            system.run(() => {
                if (player.isValid) {
                    player.runCommand(`kick @s §o§7\n\n${reason}`); // Kick the player from the server
                }
            });
            return;
        }

        // Update the player's packet history
        packetLimits.set(player, packetsSent);
        startIndices.set(player, startIndex);
    };

    // Subscribe to the packet receive event and monitor specific packet types
    beforeEvents.packetReceive.subscribe(packetReceiveCallback, {
        monitoredPacketIds: [PacketId.CommandRequestPacket, PacketId.LegacyTelemetryEventPacket],
    });

    // Define the player leave callback to clean up packet data when a player leaves
    playerLeaveCallback = (event: PlayerLeaveBeforeEvent) => {
        packetLimits.delete(event.player); // Remove the player's packet history
        startIndices.delete(event.player); // Remove the player's start index
    };

    // Subscribe to the player leave event to handle cleanup
    world.beforeEvents.playerLeave.subscribe(playerLeaveCallback);
}

/**
 * Start the packet handler by initializing the packet processing system.
 * @returns {Promise<boolean>} Resolves to `true` if successful, `false` otherwise.
 */
export async function startPacketHandler(): Promise<boolean> {
    const success = await initializePacketHandler();
    if (success === false) {
        return false;
    }
    return true;
}

/**
 * Stop the packet handler by unsubscribing from events and clearing state.
 * This will stop monitoring packets and remove any tracked packet data.
 */
export function stopPacketHandler(): void {
    // Unsubscribe from the packet receive and player leave events
    if (beforeEvents && packetReceiveCallback && playerLeaveCallback) {
        beforeEvents.packetReceive.unsubscribe(packetReceiveCallback); // Unsubscribe from packet receive event
        world.beforeEvents.playerLeave.unsubscribe(playerLeaveCallback); // Unsubscribe from player leave event

        // Clear all packet tracking data and banned players
        packetLimits.clear();
        startIndices.clear();
    }
}
