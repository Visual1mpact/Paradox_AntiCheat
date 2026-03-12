import { PlayerLeaveBeforeEvent, system, world } from "@minecraft/server";
import { banlistDB } from "../event-listeners/world-initialize";
import { PacketReceivedBeforeEvent } from "@minecraft/server-net";
import { AsyncPlayerJoinBeforeEvent } from "@minecraft/server-admin";
import * as CryptoESImport from "../node_modules/crypto-es";

const CryptoES = (CryptoESImport as unknown as { default: typeof CryptoESImport }).default ?? CryptoESImport;

/**
 * Ring buffer for timestamps used in rate-limiting.
 * This data structure efficiently stores a fixed-size sliding window of timestamps,
 * automatically overwriting oldest entries when full.
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

/**
 * Dynamic property key used to persist the AES encryption key in the world.
 * This allows the encryption key to survive server restarts so previously
 * generated encrypted tokens remain valid.
 */
const AES_KEY_PROPERTY = "paradox_aes_key";

/**
 * Dynamic property key used to store the encrypted proxy validation token.
 * This property is persistent and shared across server restarts.
 */
const TOKEN_PROPERTY = "paradox_proxy_token";

/**
 * Retrieves the encrypted server proxy token from world dynamic properties.
 * If no token exists yet, a new encrypted token is generated and stored.
 *
 * This token persists across server restarts.
 */
function getOrCreateProxyToken(): string {
    let token = world.getDynamicProperty(TOKEN_PROPERTY) as string | undefined;

    if (!token) {
        token = generateEncryptedToken();
        world.setDynamicProperty(TOKEN_PROPERTY, token);
    }

    return token;
}

/**
 * Generates a safe, unique kick tag for use with Minecraft selector commands.
 *
 * This function takes the server's persistent proxy token, hashes it using SHA-256,
 * and converts it to a hexadecimal string. The result is truncated to 16 characters
 * to ensure it is safe for use as a player tag in Minecraft commands.
 *
 * @returns {string} A 16-character hexadecimal string that can be safely used as a temporary player tag.
 *
 * @remarks
 * Minecraft player tags cannot safely contain certain characters (e.g., '+', '/', '=')
 * that may appear in Base64-encoded data. This function hashes the token to avoid
 * invalid characters and ensures consistent tag length.
 *
 * @example
 * const tag = getKickTag();
 * player.addTag(tag);
 * runCommand(`kick @a[tag=${tag}] You have been kicked.`);
 */
function getKickTag(): string {
    const token = getOrCreateProxyToken();
    return CryptoES.SHA256(token).toString(CryptoES.Hex).slice(0, 16);
}

/**
 * Retrieves the server AES encryption key from world dynamic properties,
 * or generates and stores a new key if one does not yet exist.
 *
 * The AES key is persisted using a world dynamic property so that encrypted
 * server tokens remain valid across server restarts. If the key is missing,
 * a new 128-bit cryptographically secure key is generated and saved.
 *
 * @returns {CryptoESImport.WordArray} The AES encryption key used for token encryption.
 *
 * @remarks
 * The key is stored as a hexadecimal string inside the world dynamic property
 * defined by {@link AES_KEY_PROPERTY}. When retrieved, the stored hex string
 * is parsed back into a CryptoES `WordArray` instance.
 *
 * @example
 * const key = getOrCreateAESKey();
 * const encrypted = CryptoES.AES.encrypt("data", key);
 */
function getOrCreateAESKey(): CryptoESImport.WordArray {
    let stored = world.getDynamicProperty(AES_KEY_PROPERTY) as string | undefined;

    if (!stored) {
        const key = CryptoES.WordArray.random(16);
        stored = key.toString(CryptoES.Hex);

        world.setDynamicProperty(AES_KEY_PROPERTY, stored);
        return key;
    }

    return CryptoES.Hex.parse(stored);
}

/**
 * Generates an AES-encrypted server token value for proxy validation.
 * Creates a random 256-bit data blob and encrypts it using AES.
 * @returns A Base64-encoded encrypted string representing the server token
 */
function generateEncryptedToken(): string {
    const AES_SECRET = getOrCreateAESKey();
    const randomData = CryptoES.WordArray.random(32); // 256-bit
    const encrypted = CryptoES.AES.encrypt(randomData, AES_SECRET);
    return encrypted.toString(); // Base64 encoded
}

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
/** Maximum packets a player may send within the global packet window */
const PLAYER_PACKET_LIMIT = 80;
/** Time window (ms) used to evaluate {@link PLAYER_PACKET_LIMIT} */
const PLAYER_PACKET_WINDOW = 1000;
/** Minimum time (ms) allowed between consecutive packets from the same player */
const MIN_PACKET_INTERVAL = 5;

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

/** Per-player buffers tracking total packet timestamps for burst detection */
const playerGlobalBuffers = new Map<string, TimestampBuffer>();
/** Stores the timestamp of the last packet received from each player */
const lastPacketTime = new Map<string, number>();
/** Per-player buffers tracking recent command packets to detect command spam */
const commandBurst = new Map<string, TimestampBuffer>();
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
    const tag = getKickTag();
    player.addTag(tag);
    world.getDimension("overworld").runCommand(`kick @a[tag=${tag}] You have been kicked.`);
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
    const normalized = event.name.normalize("NFKD").toLowerCase();
    if (normalized.includes("discord.gg")) event.disconnect();
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
    if (world.getDynamicProperty(TOKEN_PROPERTY) === undefined) {
        const token = generateEncryptedToken();
        world.setDynamicProperty(TOKEN_PROPERTY, token);
    }

    const info = player.clientSystemInfo;

    // If client info is missing, treat as invalid
    if (!info) {
        banish(player);
        return;
    }

    const { maxRenderDistance, platformType, memoryTier } = info;

    const invalidRenderDistance = maxRenderDistance == null || Number.isNaN(maxRenderDistance) || maxRenderDistance < 6 || maxRenderDistance > 96;

    const invalidMemory = (platformType === "Desktop" && memoryTier === 0) || (platformType === "Console" && memoryTier <= 1);

    if (invalidRenderDistance || invalidMemory) {
        banish(player);
    }
}

/**
 * Initializes the packet handler, anti-spam system, join protection, and proxy protection.
 * Sets up event subscriptions for async player join, packet receive, and player leave events.
 * Configures monitored packet IDs and initializes required module references.
 * @returns A promise that resolves to false if module imports fail, otherwise void
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

        /** Command burst protection */

        if (packetId === PacketId.CommandRequestPacket) {
            let cmdBuffer = commandBurst.get(playerName);

            if (!cmdBuffer) {
                cmdBuffer = new TimestampBuffer(20);
                commandBurst.set(playerName, cmdBuffer);
            }

            cmdBuffer.push(now);
            cmdBuffer.prune(now, 2000);

            if (cmdBuffer.size() > 8) {
                data.cancel = true;
                banish(player);
                return;
            }
        }

        /** Minimum packet timing detection */

        const lastTime = lastPacketTime.get(playerName);

        if (lastTime && now - lastTime < MIN_PACKET_INTERVAL) {
            data.cancel = true;
            return;
        }

        lastPacketTime.set(playerName, now);

        /** Global burst detection */

        globalBuffer.push(now);
        globalBuffer.prune(now, GLOBAL_WINDOW);
        if (globalBuffer.size() > GLOBAL_PACKET_LIMIT) triggerLockdown();

        /** Per-player global packet limit */

        let playerGlobal = playerGlobalBuffers.get(playerName);

        if (!playerGlobal) {
            playerGlobal = new TimestampBuffer(PLAYER_PACKET_LIMIT * 2);
            playerGlobalBuffers.set(playerName, playerGlobal);
        }

        playerGlobal.push(now);
        playerGlobal.prune(now, PLAYER_PACKET_WINDOW);

        if (playerGlobal.size() > PLAYER_PACKET_LIMIT) {
            data.cancel = true;
            banish(player);
            return;
        }

        /** Per-packet limits */

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
        const name = event.player.name;
        packetLimits.delete(name);
        lastPacketType.delete(name);
        playerGlobalBuffers.delete(name);
        lastPacketTime.delete(name);
        commandBurst.delete(name);
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
    playerGlobalBuffers.clear();
    lastPacketType.clear();
    lastPacketTime.clear();
    commandBurst.clear();
    recentViolators.length = 0;
    joinAttempts.length = 0;

    if (lockdownTimeout !== undefined) {
        system.clearRun(lockdownTimeout);
        lockdownTimeout = undefined;
    }
    isLockedDown = false;

    packetHandlerRef = null;
    asyncJoinRef = null;
    playerLeaveRef = null;
}
