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

/**
 * Maximum number of packets allowed within the defined TIME_WINDOW.
 */
const RATE_LIMIT = 5;

/**
 * Time window in milliseconds for packet rate limiting.
 */
const TIME_WINDOW = 200;

/**
 * Time window used to track recent violators for potential attack detection.
 */
const VIOLATOR_WINDOW = 2000;

/**
 * Number of violators within the window required to trigger server lockdown.
 */
const LOCKDOWN_THRESHOLD = 3;

/**
 * Fixed buffer size for storing packet timestamps.
 * Sized at double the rate limit to allow safe pruning.
 */
const BUFFER_SIZE = RATE_LIMIT * 2;

/**
 * Ring buffer implementation for efficiently storing
 * recent packet timestamps for a player.
 *
 * This avoids expensive array shifts and keeps
 * operations O(1) for push and prune operations.
 */
class TimestampBuffer {
    private buffer = new Array<number>(BUFFER_SIZE);
    private start = 0;
    private count = 0;

    /**
     * Adds a new timestamp to the buffer.
     *
     * @param timestamp - The current packet timestamp in milliseconds.
     */
    push(timestamp: number) {
        const index = (this.start + this.count) % BUFFER_SIZE;
        this.buffer[index] = timestamp;

        if (this.count < BUFFER_SIZE) {
            this.count++;
        } else {
            this.start = (this.start + 1) % BUFFER_SIZE;
        }
    }

    /**
     * Removes timestamps older than the allowed time window.
     *
     * @param now - Current timestamp used for comparison.
     */
    prune(now: number) {
        while (this.count > 0) {
            const ts = this.buffer[this.start];

            if (now - ts <= TIME_WINDOW) break;

            this.start = (this.start + 1) % BUFFER_SIZE;
            this.count--;
        }
    }

    /**
     * Returns the number of timestamps currently stored.
     *
     * @returns number of recent packets in the time window.
     */
    size() {
        return this.count;
    }
}

/**
 * Map of player names to their packet timestamp buffers.
 *
 * Used for enforcing packet rate limits.
 *
 * Key: player name
 * Value: timestamp ring buffer
 */
const packetLimits = new Map<string, TimestampBuffer>();

/**
 * Stores recent packet violators used to detect
 * potential DoS attack patterns.
 */
const recentViolators: { name: string; timestamp: number }[] = [];

/**
 * Indicates whether the server is currently in lockdown mode.
 */
let isLockedDown = false;

/**
 * Timeout reference used to lift lockdown after a delay.
 */
let lockdownTimeout: number | undefined;

/**
 * Reference to the packet receive handler for proper unsubscription.
 */
let packetHandlerRef: (data: PacketReceivedBeforeEvent) => void;

/**
 * Reference to the async join handler for proper unsubscription.
 */
let asyncJoinRef: (event: AsyncPlayerJoinBeforeEvent) => Promise<void>;

/**
 * Reference to the player leave handler for cleanup.
 */
let playerLeaveRef: (event: PlayerLeaveBeforeEvent) => void;

/**
 * Initializes packet rate limiting and DoS mitigation handlers.
 *
 * Dynamically imports required modules and subscribes
 * to relevant server events.
 *
 * @returns Promise resolving to false if required modules are unavailable.
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

    /**
     * Handles early join events to prevent banned players
     * or new connections during server lockdown.
     */
    asyncJoinRef = async (event) => {
        const { name } = event;

        const bannedPlayers = banlistDB.get("players") ?? {};
        isLockedDown = (world.getDynamicProperty("lockdown_b") as boolean) || false;

        if (isLockedDown) {
            event.disconnect("§o§7\n\nUnder Maintenance! Sorry for the inconvenience.");
            return;
        }

        if (name in bannedPlayers) {
            event.disconnect("§o§c[Paradox] You are banned from this server.");
        }
    };

    /**
     * Packet receive handler used to enforce packet rate limits.
     *
     * Cancels packets that exceed the allowed rate and
     * may ban the offending player or trigger server lockdown.
     */
    packetHandlerRef = async (data) => {
        const player = data.sender;

        if (!player || !player.isValid) {
            data.cancel = true;
            return;
        }

        const playerName = player.name;
        const now = Date.now();

        let buffer = packetLimits.get(playerName);

        if (!buffer) {
            buffer = new TimestampBuffer();
            packetLimits.set(playerName, buffer);
        }

        buffer.push(now);
        buffer.prune(now);

        if (buffer.size() > RATE_LIMIT) {
            data.cancel = true;

            recentViolators.push({ name: playerName, timestamp: now });

            const cutoff = now - VIOLATOR_WINDOW;

            while (recentViolators.length && recentViolators[0].timestamp < cutoff) {
                recentViolators.shift();
            }

            if (!isLockedDown && recentViolators.length >= LOCKDOWN_THRESHOLD) {
                isLockedDown = true;

                world.sendMessage("§o§c[Paradox] DoS attack detected. Locking down server for 60 seconds.");

                lockdownTimeout = system.runTimeout(() => {
                    isLockedDown = false;
                    recentViolators.length = 0;

                    world.sendMessage("§2[§7Paradox§2]§o§7 Lockdown lifted. Server is now open.");
                }, 1200);
            }

            const bannedPlayers = banlistDB.get("players") ?? {};

            if (!(playerName in bannedPlayers)) {
                bannedPlayers[playerName] = {
                    reason: "Rate limit abuse",
                    bannedBy: "System",
                    timestamp: now,
                };

                await banlistDB.set("players", bannedPlayers);
            }

            packetLimits.delete(playerName);

            world.sendMessage(`§2[§7Paradox§2]§o§7 ${playerName} triggered rate-limiting.`);

            system.run(() => {
                if (player.isValid) {
                    player.runCommand(`kick @s Using a modified client or causing spam.`);
                }
            });

            return;
        }
    };

    /**
     * Cleans up packet tracking when a player leaves the server.
     */
    playerLeaveRef = (event) => {
        packetLimits.delete(event.player.name);
    };

    serverNet.packetReceive.subscribe(packetHandlerRef, {
        monitoredPacketIds: [PacketId.CommandRequestPacket, PacketId.LegacyTelemetryEventPacket, PacketId.TextPacket, PacketId.EmotePacket, PacketId.MovePlayerPacket],
    });

    serverAdmin.asyncPlayerJoin.subscribe(asyncJoinRef);
    world.beforeEvents.playerLeave.subscribe(playerLeaveRef);
}

/**
 * Starts the packet handler system.
 *
 * @returns Promise resolving to true if initialization succeeded.
 */
export async function startPacketHandler(): Promise<boolean> {
    const success = await initializePacketHandler();
    return success === false ? false : true;
}

/**
 * Stops packet monitoring and cleans up all handlers
 * and in-memory tracking data.
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
    recentViolators.length = 0;

    if (lockdownTimeout !== undefined) {
        system.clearRun(lockdownTimeout);
        lockdownTimeout = undefined;
    }

    isLockedDown = false;
}
