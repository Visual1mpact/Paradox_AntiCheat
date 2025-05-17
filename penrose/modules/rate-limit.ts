import { Player, PlayerLeaveBeforeEvent, system, world } from "@minecraft/server";
import { banlistDB } from "../event-listeners/world-initialize";
import { PacketReceivedBeforeEvent } from "@minecraft/server-net";
import { AsyncPlayerJoinBeforeEvent } from "@minecraft/server-admin";

// Dynamic import references to handle network and admin events conditionally
let serverNet: typeof import("@minecraft/server-net").beforeEvents;
let PacketId: typeof import("@minecraft/server-net").PacketId;
let serverAdmin: typeof import("@minecraft/server-admin").beforeEvents;

// Per-player packet timestamp buffer
const packetLimits = new Map<Player, number[]>();
const startIndices = new Map<Player, number>();

// Recent violators used for attack pattern detection and triggering lockdown
const recentViolators: { timestamp: number; name: string }[] = [];

// Lockdown status and timeout reference
let isLockedDown = false;
let lockdownTimeout: number | undefined;

// Reference to event handlers for proper unsubscription later
let packetHandlerRef: (data: PacketReceivedBeforeEvent) => void;
let asyncJoinRef: (event: AsyncPlayerJoinBeforeEvent) => Promise<void>;
let playerLeaveRef: (event: PlayerLeaveBeforeEvent) => void;

/**
 * Initializes packet spam detection and lockdown logic.
 * Dynamically imports required modules and sets up handlers.
 *
 * @returns {Promise<boolean | void>} Whether initialization succeeded.
 */
async function initializePacketHandler(): Promise<boolean | void> {
    try {
        const networkModule = await import("@minecraft/server-net");
        const adminModule = await import("@minecraft/server-admin");
        serverNet = networkModule.beforeEvents;
        PacketId = networkModule.PacketId;
        serverAdmin = adminModule.beforeEvents;
    } catch {
        // Module may not be supported in this environment
        return false;
    }

    /**
     * Handles early player join events, disconnecting banned players or during lockdown.
     */
    asyncJoinRef = async (event) => {
        const { name } = event;
        const banned = banlistDB.get<string[]>("players") ?? [];
        isLockedDown = (world.getDynamicProperty("lockdown_b") as boolean) || false;

        if (isLockedDown) {
            event.disconnect(`§o§7\n\nUnder Maintenance! Sorry for the inconvenience.`);
            return;
        }

        if (banned.includes(name)) {
            event.disconnect(`§o§c[Paradox] You are banned from this server.`);
            return;
        }
    };

    /**
     * Handles incoming packets, enforcing rate limits and initiating lockdown if abuse is detected.
     */
    packetHandlerRef = (data) => {
        const { sender: player } = data;
        const now = Date.now();
        const banned = banlistDB.get<string[]>("players") ?? [];

        // Block unknown or invalid senders
        if (!player || !player.isValid) {
            data.cancel = true;
            return;
        }

        const packets = packetLimits.get(player) ?? [];
        let startIndex = startIndices.get(player) ?? 0;

        // Remove old timestamps outside of the 200ms window
        while (startIndex < packets.length && packets[startIndex] <= now - 200) {
            startIndex++;
        }

        packets.push(now);

        // If rate limit exceeded (5 packets in 200ms), block and respond
        if (packets.length - startIndex > 5) {
            data.cancel = true;

            recentViolators.push({ timestamp: now, name: player.name });

            // Prune old entries older than 2 seconds
            const cutoff = now - 2000;
            while (recentViolators.length > 0 && recentViolators[0].timestamp < cutoff) {
                recentViolators.shift();
            }

            // If enough violators in short time, enter lockdown
            if (!isLockedDown && recentViolators.length >= 3) {
                isLockedDown = true;
                world.sendMessage(`§o§c[Paradox] DoS attack detected. Locking down server for 60 seconds.`);

                lockdownTimeout = system.runTimeout(() => {
                    isLockedDown = false;
                    recentViolators.length = 0;
                    world.sendMessage(`§o§a[Paradox] Lockdown lifted. Server is now open.`);
                }, 1200); // 60 seconds
            }

            // Ban offending player if not already banned
            if (!banned.includes(player.name)) {
                banned.push(player.name);
                banlistDB.set("players", banned);
            }

            // Cleanup per-player tracking
            packetLimits.delete(player);
            startIndices.delete(player);

            world.sendMessage(`§2[§7Paradox§2]§r §o§7${player.name}§7 triggered rate-limiting.`);

            system.run(() => {
                if (player.isValid) {
                    player.runCommand(`kick @s §o§7\n\nUsing a modified client or causing spam.`);
                }
            });

            return;
        }

        // Update tracking
        packetLimits.set(player, packets);
        startIndices.set(player, startIndex);
    };

    /**
     * Cleans up tracking data when a player leaves the server.
     */
    playerLeaveRef = (event) => {
        packetLimits.delete(event.player);
        startIndices.delete(event.player);
    };

    // Subscribe to monitored packet types
    serverNet.packetReceive.subscribe(packetHandlerRef, {
        monitoredPacketIds: [PacketId.CommandRequestPacket, PacketId.LegacyTelemetryEventPacket, PacketId.TextPacket, PacketId.EmotePacket, PacketId.MovePlayerPacket],
    });

    // Subscribe to early join event and leave cleanup
    serverAdmin.asyncPlayerJoin.subscribe(asyncJoinRef);
    world.beforeEvents.playerLeave.subscribe(playerLeaveRef);
}

/**
 * Starts the packet handling system and DoS mitigation.
 *
 * @returns {Promise<boolean>} Whether the handler started successfully.
 */
export async function startPacketHandler(): Promise<boolean> {
    const success = await initializePacketHandler();
    return success === false ? false : true;
}

/**
 * Stops all event handlers and resets packet tracking and lockdown state.
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

    // Reset all tracking
    packetLimits.clear();
    startIndices.clear();
    recentViolators.length = 0;

    if (lockdownTimeout !== undefined) {
        system.clearRun(lockdownTimeout);
        isLockedDown = false;
        lockdownTimeout = undefined;
    }
}
