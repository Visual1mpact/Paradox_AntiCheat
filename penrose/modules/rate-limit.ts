import { PlayerLeaveBeforeEvent, system, world } from "@minecraft/server";
import { banlistDB } from "../event-listeners/world-initialize";
import { PacketReceivedBeforeEvent } from "@minecraft/server-net";
import { AsyncPlayerJoinBeforeEvent } from "@minecraft/server-admin";
import * as CryptoESImport from "../node_modules/crypto-es";

const CryptoES = (CryptoESImport as any).default ?? CryptoESImport;

/**
 * Ring buffer for timestamps used in rate-limiting.
 * This data structure efficiently stores a fixed-size sliding window of timestamps,
 * automatically overwriting oldest entries when full.
 * @since 1.0.0
 */
class TimestampBuffer {
    /** Internal array storage for timestamps */
    private buffer: number[];
    /** Index pointing to the oldest element in the buffer */
    private start = 0;
    /** Current number of valid timestamps in the buffer */
    private count = 0;
    /** Maximum capacity of the buffer */
    private maxSize: number;

    /**
     * Creates a new TimestampBuffer instance.
     * @param maxSize - The maximum number of timestamps to store in the buffer
     */
    constructor(maxSize: number) {
        this.maxSize = maxSize;
        this.buffer = new Array<number>(maxSize);
    }

    /**
     * Adds a new timestamp to the buffer.
     * If the buffer is full, the oldest timestamp is overwritten.
     * @param ts - The timestamp (in milliseconds) to add to the buffer
     */
    push(ts: number) {
        const index = (this.start + this.count) % this.maxSize;
        this.buffer[index] = ts;

        if (this.count < this.maxSize) this.count++;
        else this.start = (this.start + 1) % this.maxSize;
    }

    /**
     * Removes timestamps older than the specified window from the buffer.
     * @param now - The current timestamp to compare against (in milliseconds)
     * @param window - The time window in milliseconds; timestamps older than (now - window) are removed
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
     * Returns the current number of timestamps in the buffer.
     * @returns The count of valid timestamps currently stored
     */
    size() {
        return this.count;
    }
}

/* ---------------- CRYPTO CONFIG ---------------- */

/** Secret key for AES encryption of server token (128-bit random key) */
const AES_SECRET = CryptoES.WordArray.random(16); // 128-bit

/**
 * Generates a dynamic property name for storing the encrypted server token.
 * Creates a unique property name using random bytes to avoid conflicts.
 * @returns A unique dynamic property name string prefixed with "proxy_token_"
 * @example "proxy_token_1a2b3c4d5e6f7890"
 */
function generateDynamicPropertyName(): string {
    const rawBytes = CryptoES.WordArray.random(16);
    return `proxy_token_${rawBytes.toString(CryptoES.Hex)}`;
}

/**
 * Generates an AES-encrypted server token value for proxy validation.
 * Creates a random 256-bit data blob and encrypts it using AES.
 * @returns A Base64-encoded encrypted string representing the server token
 */
function generateEncryptedToken(): string {
    const randomData = CryptoES.WordArray.random(32); // 256-bit
    const encrypted = CryptoES.AES.encrypt(randomData, AES_SECRET);
    return encrypted.toString(); // Base64 encoded
}

/** Dynamic property name used to store the server's encrypted token in world properties */
const DYNAMIC_PROPERTY_NAME = generateDynamicPropertyName();

/* ---------------- CONFIG ---------------- */

/** Time window (in milliseconds) to track recent packet violators for lockdown detection */
const VIOLATOR_WINDOW = 2000;
/** Number of recent violators required within the VIOLATOR_WINDOW to trigger server lockdown */
const LOCKDOWN_THRESHOLD = 3;
/** Maximum number of packets allowed globally within the GLOBAL_WINDOW before triggering burst protection */
const GLOBAL_PACKET_LIMIT = 200;
/** Time window (in milliseconds) for detecting global packet burst anomalies */
const GLOBAL_WINDOW = 1000;
/** Time window (in milliseconds) to track join attempts for anti-flood protection */
const JOIN_WINDOW = 5000;
/** Maximum number of join attempts allowed per JOIN_WINDOW before rejecting new connections */
const JOIN_LIMIT = 30;
/**
 * Packet rate limits configuration per packet type.
 * Each entry specifies the maximum number of packets allowed (limit)
 * within a specific time window (window in milliseconds).
 */
const PACKET_LIMITS: Record<string, { limit: number; window: number }> = {
    MovePlayerPacket: { limit: 40, window: 1000 },
    TextPacket: { limit: 3, window: 2000 },
    CommandRequestPacket: { limit: 5, window: 1000 },
    EmotePacket: { limit: 5, window: 5000 },
};

/* ----------------- TRACKING ----------------- */

/**
 * Stores per-player per-packet timestamp buffers for rate limiting.
 * Outer Map key: player name, Inner Map key: packet ID
 */
const packetLimits = new Map<string, Map<string, TimestampBuffer>>();
/** Global packet timestamp buffer used for detecting server-wide packet bursts */
const globalBuffer = new TimestampBuffer(GLOBAL_PACKET_LIMIT * 2);
/**
 * List of recent violators detected for potential attack analysis.
 * Each entry contains the player's name and the timestamp of the violation.
 */
const recentViolators: { name: string; timestamp: number }[] = [];
/** Array storing timestamps of recent join attempts for anti-flood detection */
const joinAttempts: number[] = [];
/** Maps each player name to their last received packet type for duplicate detection */
const lastPacketType = new Map<string, string>();
/** Flag indicating whether the server is currently in lockdown mode due to detected anomalies */
let isLockedDown = false;
/** Timeout ID reference used to automatically lift lockdown after a delay */
let lockdownTimeout: number | undefined;
/** Reference to the packet receive event handler function for unsubscribing */
let packetHandlerRef: (data: PacketReceivedBeforeEvent) => void;
/** Reference to the async player join event handler for unsubscribing */
let asyncJoinRef: (event: AsyncPlayerJoinBeforeEvent) => Promise<void>;
/** Reference to the player leave event handler for cleanup on disconnect */
let playerLeaveRef: (event: PlayerLeaveBeforeEvent) => void;
/** Reference to the server-net module's beforeEvents API for packet handling */
let serverNet: typeof import("@minecraft/server-net").beforeEvents;
/** Reference to the PacketId enum from server-net for filtering monitored packets */
let PacketId: typeof import("@minecraft/server-net").PacketId;
/** Reference to the server-admin module's beforeEvents API for async join handling */
let serverAdmin: typeof import("@minecraft/server-admin").beforeEvents;

/* ----------------- UTILITY ----------------- */

/**
 * Kicks a player from the server using the encrypted server token as a temporary tag.
 * This method tags the player with the dynamic token and executes a kick command
 * targeting all players with that tag, then removes the tag.
 * @param player - The player object to banish (kick) from the server
 */
function banish(player: import("@minecraft/server").Player) {
    const token = world.getDynamicProperty(DYNAMIC_PROPERTY_NAME);
    if (!token) return;
    player.addTag(token as string);
    world.getDimension("overworld").runCommand(`kick @a[tag=${token}] ${token}`);
}

/**
 * Logs denied proxy connections to server chat with formatting.
 * Sends a formatted message indicating a connection was denied.
 * @param name - The name of the player or entity whose connection was denied
 */
function logDenied(name: string) {
    world.sendMessage(`§o§c[Paradox] Connection denied: §e${name}`);
}

/* ----------------- LOCKDOWN ----------------- */

/**
 * Triggers server lockdown due to excessive packet traffic or detected abuse.
 * When activated, sets the isLockedDown flag and schedules automatic lockdown
 * release after 1200 ticks. Clears the recent violators list when lifted.
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

/* ----------------- INITIALIZE ----------------- */

/**
 * Handles early join events with anti-flood protection, ban checks, and proxy validation.
 * Performs multiple security checks on the connecting player including name validation,
 * flood detection, banlist lookup, and active lockdown status verification.
 * @param event - The async player join before event object containing player connection details
 * @returns Promise that resolves when all checks are complete
 */
async function handleAsyncJoin(event: AsyncPlayerJoinBeforeEvent) {
    const now = Date.now();

    // Early proxy name checks
    if (
        !event.name ||
        event.name.trim() === "" ||
        event.name === "Steve" ||
        event.name.includes('"') ||
        event.name.includes(".") ||
        event.name.includes("/") ||
        event.name.includes("discord.gg") ||
        (world.getAllPlayers().length > 0 && event.persistentId.length === 0)
    ) {
        event.disconnect();
        if (event.name) logDenied(event.name);
        return;
    }

    // Flood tracking
    joinAttempts.push(now);
    while (joinAttempts.length && joinAttempts[0] < now - JOIN_WINDOW) joinAttempts.shift();
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
}

/**
 * Handles player spawn events for suspicious client detection and token initialization.
 * Validates client system information and creates the encrypted server token if missing.
 * @param event - The player spawn after event containing player and spawn type information
 */
function handlePlayerSpawn(event: import("@minecraft/server").PlayerSpawnAfterEvent) {
    const { player, initialSpawn } = event;
    if (!initialSpawn) return;

    // Ensure the encrypted world token exists
    if (world.getDynamicProperty(DYNAMIC_PROPERTY_NAME) === undefined) {
        const token = generateEncryptedToken();
        world.setDynamicProperty(DYNAMIC_PROPERTY_NAME, token);
    }

    const info = player.clientSystemInfo;

    // If client info is missing, treat as invalid
    if (!info) {
        banish(player);
        logDenied(player.name);
        return;
    }

    const { maxRenderDistance, platformType, memoryTier } = info;

    const invalidRenderDistance = maxRenderDistance == null || Number.isNaN(maxRenderDistance) || maxRenderDistance < 6 || maxRenderDistance > 96;

    const invalidMemory = (platformType === "Desktop" && memoryTier === 0) || (platformType === "Console" && memoryTier <= 1);

    if (invalidRenderDistance || invalidMemory) {
        banish(player);
        logDenied(player.name);
    }
}

/**
 * Initializes the packet handler, anti-spam system, join protection, and proxy protection.
 * Sets up event subscriptions for async player join, packet receive, and player leave events.
 * Configures monitored packet IDs and initializes required module references.
 * @returns A promise that resolves to false if module imports fail, otherwise void
 * @since 1.0.0
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

    asyncJoinRef = async (event) => handleAsyncJoin(event);
    serverAdmin.asyncPlayerJoin.subscribe(asyncJoinRef);
    world.afterEvents.playerSpawn.subscribe(handlePlayerSpawn);

    // Existing packet handler
    packetHandlerRef = async (data) => {
        const player = data.sender;
        if (!player || !player.isValid) {
            data.cancel = true;
            return;
        }
        const playerName = player.name;
        const packetId = data.packetId;
        const now = Date.now();

        // Global burst detection
        globalBuffer.push(now);
        globalBuffer.prune(now, GLOBAL_WINDOW);
        if (globalBuffer.size() > GLOBAL_PACKET_LIMIT) triggerLockdown();

        // Per-packet limits
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

        const last = lastPacketType.get(playerName);
        if (last === packetId && buffer.size() > config.limit) data.cancel = true;
        lastPacketType.set(playerName, packetId);

        if (buffer.size() > config.limit) {
            data.cancel = true;
            recentViolators.push({ name: playerName, timestamp: now });
            const cutoff = now - VIOLATOR_WINDOW;
            while (recentViolators.length && recentViolators[0].timestamp < cutoff) recentViolators.shift();
            if (recentViolators.length >= LOCKDOWN_THRESHOLD) triggerLockdown();

            const bannedPlayers = banlistDB.get("players") ?? {};
            if (!(playerName in bannedPlayers)) {
                bannedPlayers[playerName] = { reason: "Packet rate abuse", bannedBy: "System", timestamp: now };
                await banlistDB.set("players", bannedPlayers);
            }

            packetLimits.delete(playerName);
            world.sendMessage(`§2[§7Paradox§2]§o§7 ${playerName} triggered rate-limiting.`);
            system.run(() => {
                if (player.isValid) player.runCommand(`kick @s Packet spam detected.`);
            });
        }
    };

    playerLeaveRef = (event) => {
        packetLimits.delete(event.player.name);
        lastPacketType.delete(event.player.name);
    };

    serverNet.packetReceive.subscribe(packetHandlerRef, {
        monitoredPacketIds: [PacketId.CommandRequestPacket, PacketId.LegacyTelemetryEventPacket, PacketId.TextPacket, PacketId.EmotePacket, PacketId.MovePlayerPacket],
    });

    world.beforeEvents.playerLeave.subscribe(playerLeaveRef);
}

/* ----------------- START / STOP ----------------- */

/**
 * Starts the packet handler system by initializing event subscriptions and handlers.
 * This function should be called during server startup or when enabling the anti-abuse system.
 * @returns A promise that resolves to true if initialization succeeded, false otherwise
 * @example
 * await startPacketHandler();
 */
export async function startPacketHandler(): Promise<boolean> {
    const success = await initializePacketHandler();
    return success === false ? false : true;
}

/**
 * Stops the packet handler system by unsubscribing from all event listeners
 * and clearing tracking data. Call this function during server shutdown
 * or when disabling the anti-abuse system to clean up resources.
 * @example
 * stopPacketHandler();
 */
export function stopPacketHandler(): void {
    if (serverNet && packetHandlerRef) serverNet.packetReceive.unsubscribe(packetHandlerRef);
    if (serverAdmin && asyncJoinRef) serverAdmin.asyncPlayerJoin.unsubscribe(asyncJoinRef);
    if (playerLeaveRef) world.beforeEvents.playerLeave.unsubscribe(playerLeaveRef);

    packetLimits.clear();
    lastPacketType.clear();
    recentViolators.length = 0;
    joinAttempts.length = 0;

    if (lockdownTimeout !== undefined) {
        system.clearRun(lockdownTimeout);
        lockdownTimeout = undefined;
    }
    isLockedDown = false;
}
