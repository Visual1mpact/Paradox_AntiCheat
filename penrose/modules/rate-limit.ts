import { Player, PlayerLeaveBeforeEvent, PlayerSpawnAfterEvent, system, world } from "@minecraft/server";
import { banlistDB } from "../event-listeners/world-initialize";
import { PacketReceivedBeforeEvent } from "@minecraft/server-net";
import { AsyncPlayerJoinBeforeEvent } from "@minecraft/server-admin";
import * as CryptoESImport from "../node_modules/crypto-es";
import { EventCoordinator } from "../classes/event-coordinator";
import { PlayerCache } from "../classes/player-cache";

/**
 * Handles CryptoES default export fallback logic for multi-environment compatibility.
 */
const CryptoES = (CryptoESImport as unknown as { default: typeof CryptoESImport }).default ?? CryptoESImport;

/**
 * Ring buffer for timestamps used in rate-limiting and burst tracking.
 * Efficiently stores a fixed-size sliding window of timestamps without array allocations.
 */
class TimestampBuffer {
    /** Fixed-capacity array storing recorded timestamps in milliseconds */
    private buffer: number[];
    /** Index pointing to the oldest element in the buffer */
    private start = 0;
    /** Current count of valid timestamps stored in the buffer */
    private count = 0;
    /** Maximum number of timestamps the buffer can store before overwriting */
    private maxSize: number;

    /**
     * Creates a new TimestampBuffer instance.
     * @param maxSize - The maximum capacity of the timestamp sliding window buffer
     */
    constructor(maxSize: number) {
        this.maxSize = maxSize;
        this.buffer = new Array<number>(maxSize);
    }

    /**
     * Adds a new timestamp to the buffer. Overwrites the oldest timestamp if full.
     * @param ts - The timestamp in milliseconds to record
     */
    push(ts: number) {
        const index = (this.start + this.count) % this.maxSize;
        this.buffer[index] = ts;

        if (this.count < this.maxSize) this.count++;
        else this.start = (this.start + 1) % this.maxSize;
    }

    /**
     * Removes all timestamps older than the designated time window relative to `now`.
     * @param now - Current timestamp in milliseconds
     * @param window - Allowed time window duration in milliseconds
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
     * Retrieves the active count of valid timestamps currently stored.
     * @returns The number of un-pruned timestamps in the buffer
     */
    size(): number {
        return this.count;
    }

    /**
     * Resets the buffer state, clearing all recorded entries without reallocating memory.
     */
    clear(): void {
        this.start = 0;
        this.count = 0;
    }
}

/* ---------------- CRYPTO & PROPERTIES ---------------- */

/** Dynamic property key used to store the server's AES encryption key in world properties */
const AES_KEY_PROPERTY = "paradox_aes_key";
/** Dynamic property key used to store the server's proxy validation token in world properties */
const TOKEN_PROPERTY = "paradox_proxy_token";
/** Dynamic property key used to store the server's global lockdown flag */
const LOCKDOWN_PROPERTY = "lockdown_b";

/**
 * Retrieves the persisted server proxy token from world dynamic properties,
 * or generates and saves a new token if one does not exist.
 * @returns The active AES-encrypted proxy token string
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
 * Generates a truncated hexadecimal tag derived from the server's hashed proxy token.
 * Used for safely tagging and kicking targeted players via Minecraft selector commands.
 * @returns A 16-character hexadecimal tag string
 */
function getKickTag(): string {
    const token = getOrCreateProxyToken();
    return CryptoES.SHA256(token).toString(CryptoES.Hex).slice(0, 16);
}

/**
 * Retrieves the stored AES encryption key or generates a new 128-bit key if missing.
 * Persists the hexadecimal representation inside world dynamic properties.
 * @returns The CryptoES WordArray representing the active AES key
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
 * Generates a dynamic AES-encrypted server token value.
 * Encrypts a random 256-bit binary blob using the server's AES key.
 * @returns Base64-encoded string representation of the encrypted token
 */
function generateEncryptedToken(): string {
    const AES_SECRET = getOrCreateAESKey();
    const randomData = CryptoES.WordArray.random(32);
    const encrypted = CryptoES.AES.encrypt(randomData, AES_SECRET);
    return encrypted.toString();
}

/* ---------------- CONFIG ---------------- */

/** Time window (in milliseconds) used to track recent rate-limit violators for lockdown detection */
const VIOLATOR_WINDOW = 2000;
/** Total number of rate-limit violations within VIOLATOR_WINDOW required to trigger global lockdown */
const LOCKDOWN_THRESHOLD = 3;
/** Maximum total incoming network packets allowed server-wide within GLOBAL_WINDOW */
const GLOBAL_PACKET_LIMIT = 200;
/** Time window (in milliseconds) for evaluating global packet limits */
const GLOBAL_WINDOW = 1000;
/** Time window (in milliseconds) used to track early connection attempts for join-flood protection */
const JOIN_WINDOW = 5000;
/** Maximum permitted player connection attempts within JOIN_WINDOW */
const JOIN_LIMIT = 30;
/** Maximum total allowed packets per individual player within PLAYER_PACKET_WINDOW */
const PLAYER_PACKET_LIMIT = 80;
/** Time window (in milliseconds) for evaluating individual total packet thresholds */
const PLAYER_PACKET_WINDOW = 1000;
/** Minimum required interval (in milliseconds) between successive packets from a single client */
const MIN_PACKET_INTERVAL = 5;

/**
 * Per-packet rate limit configuration lookup map.
 * Defines maximum capacity (limit) and sliding evaluate duration (window) per packet ID.
 */
const PACKET_LIMITS: Record<string, { limit: number; window: number }> = {
    MovePlayerPacket: { limit: 40, window: 1000 },
    TextPacket: { limit: 3, window: 2000 },
    CommandRequestPacket: { limit: 5, window: 1000 },
    EmotePacket: { limit: 5, window: 5000 },
};

type BanEntry = {
    reason: string;
    bannedBy: string;
    timestamp: number;
};

type BanlistMap = Record<string, BanEntry>;

/* ----------------- TRACKING ----------------- */

/** Map tracking overall per-player packet arrival timestamps */
const playerGlobalBuffers = new Map<string, TimestampBuffer>();
/** Map storing the most recent packet arrival timestamp for each player name */
const lastPacketTime = new Map<string, number>();
/** Map tracking command execution request timestamps per player to detect command spam */
const commandBurst = new Map<string, TimestampBuffer>();
/** Nested map tracking timestamp buffers per packet ID for each player name */
const packetLimits = new Map<string, Map<string, TimestampBuffer>>();
/** Global timestamp buffer tracking incoming packet velocity across all clients */
const globalBuffer = new TimestampBuffer(GLOBAL_PACKET_LIMIT * 2);
/** Global buffer tracking timestamps of recent player rate-limiting violations */
const recentViolatorsBuffer = new TimestampBuffer(LOCKDOWN_THRESHOLD * 2);
/** Global buffer tracking connection attempt timestamps for join-flood detection */
const joinAttemptsBuffer = new TimestampBuffer(JOIN_LIMIT * 2);
/** Map recording the ID of the last processed packet per player name */
const lastPacketType = new Map<string, string>();

/** Local state flag indicating active server lockdown */
let isLockedDown = false;
/** System timeout ID reference for automatic lockdown expiry */
let lockdownTimeout: number | undefined;
/** System interval ID reference for periodic memory garbage collection sweeps */
let sweepInterval: number | undefined;

/** Active subscription reference for packet-receive events */
let packetHandlerRef: ((data: PacketReceivedBeforeEvent) => void) | null = null;
/** Active subscription reference for async player join before-events */
let asyncJoinRef: ((event: AsyncPlayerJoinBeforeEvent) => Promise<void>) | null = null;
/** Active subscription reference for player leave before-events */
let playerLeaveRef: ((event: PlayerLeaveBeforeEvent) => void) | null = null;
/** Active subscription reference for player spawn after-events */
let playerSpawnRef: ((event: PlayerSpawnAfterEvent) => void) | null = null;

/** Module reference for server-net event management API */
let serverNet: typeof import("@minecraft/server-net").beforeEvents;
/** Enumeration reference containing server network packet identifiers */
let PacketId: typeof import("@minecraft/server-net").PacketId;
/** Module reference for server-admin event management API */
let serverAdmin: typeof import("@minecraft/server-admin").beforeEvents;

/* ----------------- UTILITIES ----------------- */

/**
 * Safely kicks a player using deferred execution in system context to prevent
 * read-only operation errors during before-event callbacks.
 * @param player - Target player object to disconnect
 */
function banish(player: Player) {
    if (!player?.isValid) return;
    const name = player.name;

    system.run(() => {
        try {
            const target = PlayerCache.getPlayerByName(name);
            if (!target?.isValid) return;

            const tag = getKickTag();
            target.addTag(tag);
            world.getDimension("overworld").runCommand(`kick @a[tag=${tag}] You have been kicked.`);
        } catch {
            // Guard against player disconnecting prior to command execution
        }
    });
}

/**
 * Purges all rate-limiting and buffer tracking maps associated with a specific player name.
 * @param name - Username of the player to cleanup
 */
function cleanupPlayerData(name: string) {
    packetLimits.delete(name);
    playerGlobalBuffers.delete(name);
    lastPacketType.delete(name);
    lastPacketTime.delete(name);
    commandBurst.delete(name);
}

/**
 * Sweeps tracking state to purge orphaned memory structures belonging to disconnected
 * or unspawned player entries not tracked by PlayerCache.
 */
function sweepOrphanedPlayerState() {
    const activeNames = new Set(PlayerCache.getPlayerNames());

    for (const name of packetLimits.keys()) {
        if (!activeNames.has(name)) cleanupPlayerData(name);
    }
}

/* ----------------- LOCKDOWN ----------------- */

/**
 * Triggers server-wide lockdown, blocking new player connections and setting lockdown indicators.
 * Automatically clears after a 1200-tick delay (60 seconds).
 */
function triggerLockdown() {
    if (isLockedDown) return;
    isLockedDown = true;
    world.setDynamicProperty(LOCKDOWN_PROPERTY, true);
    world.sendMessage("§o§c[Paradox] Network anomaly detected. Server entering lockdown.");

    lockdownTimeout = system.runTimeout(() => {
        isLockedDown = false;
        world.setDynamicProperty(LOCKDOWN_PROPERTY, false);
        recentViolatorsBuffer.clear();
        world.sendMessage("§2[§7Paradox§2]§o§7 Lockdown lifted. Server is now open.");
    }, 1200);
}

/* ----------------- EVENT HANDLERS ----------------- */

/**
 * Intercepts early player join attempts to validate player names, enforce ban lists,
 * perform connection-rate checks, and enforce active lockdown state.
 * @param event - The AsyncPlayerJoinBeforeEvent context
 */
async function handleAsyncJoin(event: AsyncPlayerJoinBeforeEvent): Promise<void> {
    const now = Date.now();

    // Proxy name / formatting checks
    const normalized = event.name ? event.name.normalize("NFKD").toLowerCase() : "";
    if (
        !event.name ||
        event.name.trim() === "" ||
        event.name === "Steve" ||
        event.name.includes('"') ||
        event.name.includes(".") ||
        event.name.includes("/") ||
        normalized.includes("discord.gg") ||
        (PlayerCache.size() > 0 && (!event.persistentId || event.persistentId.length === 0))
    ) {
        event.disconnect();
        return;
    }

    // Rate-limit join attempts via ring buffer
    joinAttemptsBuffer.push(now);
    joinAttemptsBuffer.prune(now, JOIN_WINDOW);
    if (joinAttemptsBuffer.size() > JOIN_LIMIT) {
        event.disconnect("Server busy. Try again later.");
        return;
    }

    // Check lockdown dynamic property state
    const dynamicLockdown = (world.getDynamicProperty(LOCKDOWN_PROPERTY) as boolean) || false;
    if (isLockedDown || dynamicLockdown) {
        event.disconnect("§o§7\n\nUnder Maintenance! Sorry for the inconvenience.");
        return;
    }

    // Synchronous memory banlist check
    const bannedPlayers = ((await banlistDB.get("players")) as Record<string, unknown>) ?? {};
    if (event.name in bannedPlayers) {
        event.disconnect("§o§c[Paradox] You are banned from this server.");
    }
}

/**
 * Validates player client specifications on spawn to disconnect invalid or modified clients.
 * @param event - PlayerSpawnAfterEvent event parameter
 */
function handlePlayerSpawn(event: PlayerSpawnAfterEvent) {
    const { player, initialSpawn } = event;
    if (!initialSpawn || !player?.isValid) return;

    if (world.getDynamicProperty(TOKEN_PROPERTY) === undefined) {
        world.setDynamicProperty(TOKEN_PROPERTY, generateEncryptedToken());
    }

    const info = player.clientSystemInfo;
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

/* ----------------- INITIALIZE ----------------- */

/**
 * Initializes the packet handler, anti-spam system, join protection, and proxy protection.
 * Dynamically imports BDS-exclusive modules (`@minecraft/server-net` and `@minecraft/server-admin`).
 *
 * @remarks
 * Realms Compatibility:
 * `@minecraft/server-net` and `@minecraft/server-admin` APIs are strictly limited to
 * Bedrock Dedicated Server (BDS) environments and are not available on Minecraft Realms.
 * If these imports fail (e.g., when hosted on a Realm), the initialization gracefully
 * catches the error and returns `false`, preventing script runtime crashes.
 *
 * @returns Resolves to `false` if module imports fail (e.g., on Realms), or `void` on successful setup.
 */
async function initializePacketHandler(): Promise<boolean | void> {
    try {
        const networkModule = await import("@minecraft/server-net");
        const adminModule = await import("@minecraft/server-admin");

        serverNet = networkModule.beforeEvents;
        PacketId = networkModule.PacketId;
        serverAdmin = adminModule.beforeEvents;
    } catch {
        console.warn("[Paradox] Network/Admin APIs unavailable. Rate-limiting is disabled (Realms environment detected).");
        return false;
    }

    PlayerCache.init();

    asyncJoinRef = (event) => handleAsyncJoin(event);
    serverAdmin.asyncPlayerJoin.subscribe(asyncJoinRef);

    playerSpawnRef = (event) => handlePlayerSpawn(event);
    EventCoordinator.subscribeAfter("playerSpawn", playerSpawnRef);

    playerLeaveRef = (event) => {
        const name = event.player?.name;
        if (name) cleanupPlayerData(name);
    };
    EventCoordinator.subscribeBefore("playerLeave", playerLeaveRef);

    // Periodic orphan cleanup every 30 seconds
    sweepInterval = system.runInterval(() => sweepOrphanedPlayerState(), 600);

    packetHandlerRef = (data) => {
        const player = data.sender;
        if (!player || !player.isValid) {
            data.cancel = true;
            return;
        }

        const playerName = player.name;
        const packetId = data.packetId;
        const now = Date.now();

        // Command burst check
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

        // Minimum packet interval check
        const lastTime = lastPacketTime.get(playerName);
        if (lastTime && now - lastTime < MIN_PACKET_INTERVAL) {
            data.cancel = true;
            return;
        }
        lastPacketTime.set(playerName, now);

        // Global server packet burst detection
        globalBuffer.push(now);
        globalBuffer.prune(now, GLOBAL_WINDOW);
        if (globalBuffer.size() > GLOBAL_PACKET_LIMIT) triggerLockdown();

        // Per-player packet limit
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

        // Per-packet type rate limits
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

            recentViolatorsBuffer.push(now);
            recentViolatorsBuffer.prune(now, VIOLATOR_WINDOW);

            if (recentViolatorsBuffer.size() >= LOCKDOWN_THRESHOLD) {
                triggerLockdown();
            }

            // Async database write handled out-of-band via system.run
            system.run(async () => {
                const bannedPlayers = ((await banlistDB.get("players")) as BanlistMap) ?? {};
                if (!(playerName in bannedPlayers)) {
                    bannedPlayers[playerName] = { reason: "Packet rate abuse", bannedBy: "System", timestamp: now };
                    await banlistDB.set("players", bannedPlayers);
                }

                if (player.isValid) {
                    player.runCommand(`kick @s Packet spam detected.`);
                }
            });

            cleanupPlayerData(playerName);
            world.sendMessage(`§2[§7Paradox§2]§o§7 ${playerName} triggered rate-limiting.`);
        }
    };

    serverNet.packetReceive.subscribe(packetHandlerRef, {
        monitoredPacketIds: [PacketId.CommandRequestPacket, PacketId.LegacyTelemetryEventPacket, PacketId.TextPacket, PacketId.EmotePacket, PacketId.MovePlayerPacket],
    });
}

/* ----------------- START / STOP ----------------- */

/**
 * Starts and initializes packet processing, anti-flood listeners, and rate-limiting structures.
 * @returns Promise resolving to `true` if initialized successfully, or `false` on failure (e.g. on Realms).
 */
export async function startPacketHandler(): Promise<boolean> {
    const success = await initializePacketHandler();
    return success !== false;
}

/**
 * Stops packet listeners, unhooks event subscriptions, clears running system tasks,
 * and purges all active memory buffers.
 */
export function stopPacketHandler(): void {
    if (serverNet && packetHandlerRef) serverNet.packetReceive.unsubscribe(packetHandlerRef);
    if (serverAdmin && asyncJoinRef) serverAdmin.asyncPlayerJoin.unsubscribe(asyncJoinRef);
    if (playerLeaveRef) EventCoordinator.unsubscribeBefore("playerLeave", playerLeaveRef);
    if (playerSpawnRef) EventCoordinator.unsubscribeAfter("playerSpawn", playerSpawnRef);

    packetLimits.clear();
    playerGlobalBuffers.clear();
    lastPacketType.clear();
    lastPacketTime.clear();
    commandBurst.clear();
    recentViolatorsBuffer.clear();
    joinAttemptsBuffer.clear();

    if (lockdownTimeout !== undefined) {
        system.clearRun(lockdownTimeout);
        lockdownTimeout = undefined;
    }
    if (sweepInterval !== undefined) {
        system.clearRun(sweepInterval);
        sweepInterval = undefined;
    }

    isLockedDown = false;
    world.setDynamicProperty(LOCKDOWN_PROPERTY, false);

    packetHandlerRef = null;
    asyncJoinRef = null;
    playerLeaveRef = null;
    playerSpawnRef = null;
}
