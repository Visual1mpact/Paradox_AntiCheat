import { Player, PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { paradoxModulesDB, spoofDB } from "../event-listeners/world-initialize";
import { buildPrison, freezePlayer, PRISON_LOCATION_PROPERTY } from "../commands/moderation/freeze";

/**
 * Represents stored identity data for a trusted player.
 */
interface TrustedPlayerData {
    /**
     * The unique player ID originally associated with this name.
     */
    id: string;

    /**
     * The timestamp (in milliseconds) when the name was first seen with the trusted ID.
     */
    firstSeen: number;

    /**
     * The last time this name was seen, regardless of spoof or not.
     */
    lastSeen: number;

    /**
     * Optional list of spoofing attempts, if any other players have tried to use this name.
     */
    spoofAttempts?: {
        /**
         * The spoofing player's actual ID.
         */
        id: string;

        /**
         * The timestamp when the spoofing attempt occurred.
         */
        timestamp: number;
    }[];
}

// Define a type for player information
interface PlayerInfo {
    name: string;
    id: string;
}

// Define a type for security clearance data
interface SecurityClearanceData {
    host?: PlayerInfo;
    securityClearanceList: PlayerInfo[];
}

// Define the type for platform block settings
interface PlatformBlockSettings {
    [key: string]: boolean;
}

// Define the types for banned and whitelisted players
type PlayerNameList = string[];

/**
 * Function to execute when a player spawns.
 * Initializes event handlers for player spawn events.
 */
export function onPlayerSpawn() {
    initializeEventHandlers();
}

/**
 * Function to initialize event handlers for player spawn events.
 * Subscribes to the player spawn event to handle additional logic.
 */
function initializeEventHandlers() {
    world.afterEvents.playerSpawn.subscribe(handlePlayerSpawn);
}

/**
 * Verifies player identity upon joining and enforces strict name-ID consistency.
 * - If a player ID already exists under a different name, the player is kicked.
 * - If a player name exists with a different ID, the player is treated as a spoofer and kicked.
 * - If the name and ID match, the player's record is updated.
 * - If any record is older than 7 days and unused, it's cleaned up.
 *
 * @param {Player} player - The player joining or spawning in the world.
 */
function handleSpoofCheck(player: Player) {
    const now = Date.now();
    const nameKey = player.name;
    const STALE_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

    const staleKeys: string[] = [];
    const corruptedKeys: string[] = [];

    // Step 1: Scan entries once to:
    // - Detect ID conflicts
    // - Track stale records
    const idCollision = spoofDB.entries().find(([storedName, data]) => {
        const record = data as TrustedPlayerData;

        // Auto-clean corrupted entries
        if (!record?.id || typeof record.lastSeen !== "number") {
            corruptedKeys.push(storedName);
            return false;
        }

        // Collect stale records for later cleanup
        if (now - record.lastSeen >= STALE_THRESHOLD) {
            staleKeys.push(storedName);
        }

        // Check for ID collision (same ID, different name)
        return record.id === player.id && storedName !== nameKey;
    });

    // Delete corrupted entries before proceeding
    corruptedKeys.forEach((key) => spoofDB.delete(key));

    if (idCollision) {
        const [knownName] = idCollision;
        player.sendMessage(`§c[Paradox] Your ID is already associated with the name "${knownName}".`);
        player.runCommand(`kick @s §o§7\n\nName change is not allowed on this server.`);
        return;
    }

    // Step 2: Check for spoof attempt via name reuse
    const record = spoofDB.get<TrustedPlayerData>(nameKey);

    if (!record) {
        // First-time entry
        spoofDB.set(nameKey, {
            id: player.id,
            firstSeen: now,
            lastSeen: now,
        });

        // Cleanup after setting new record
        [...staleKeys, ...corruptedKeys].forEach((key) => spoofDB.delete(key));
        return;
    }

    if (record.id !== player.id) {
        // Spoof detected
        const attempt = { id: player.id, timestamp: now };
        if (!record.spoofAttempts) record.spoofAttempts = [];
        record.spoofAttempts.push(attempt);
        record.lastSeen = now;

        spoofDB.set(nameKey, record);

        player.sendMessage(`§c[Paradox] Name spoof detected. This name belongs to another player.`);
        player.runCommand(`kick @s §o§7\n\nSpoofing is not allowed.`);

        [...staleKeys, ...corruptedKeys].forEach((key) => spoofDB.delete(key));
        return;
    }

    // Step 3: Valid player — update and clean
    record.lastSeen = now;
    spoofDB.set(nameKey, record);

    [...staleKeys, ...corruptedKeys].forEach((key) => spoofDB.delete(key));
}

/**
 * Handles player spawn events.
 * This function is triggered when a player spawns in the world.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function handlePlayerSpawn(event: PlayerSpawnAfterEvent) {
    const player = event.player;

    if (event.initialSpawn) {
        checkMemoryAndRenderDistance(event);
        isPlatformBlocked(event);
        handleBanCheck(event);
        handleSecurityClearance(event);
        allowList(event);
    }

    // They can change their name at any given time so lets check whenever they spawn
    handleSpoofCheck(player);

    // Check if the player is imprisoned after respawn
    const isImprisoned = player.getDynamicProperty(PRISON_LOCATION_PROPERTY);
    if (isImprisoned) {
        // Rebuild the prison and freeze the player if they were previously imprisoned
        buildPrison(player);
        freezePlayer(player);
        player.sendMessage(`§2[§7Paradox§2]§o§7 You have been imprisoned again after respawn.`);
    }
}

/**
 * Checks the player's memoryTier and maxRenderDistance.
 * If both are undefined, the player will be banned.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function checkMemoryAndRenderDistance(event: PlayerSpawnAfterEvent) {
    const player = event.player;
    const playerName = player.name;

    // Safely parse the bannedPlayers and whitelistedPlayers from dynamic properties
    const bannedPlayers: PlayerNameList = JSON.parse((world.getDynamicProperty("bannedPlayers") as string) ?? "[]");
    const whitelistedPlayers: PlayerNameList = JSON.parse((world.getDynamicProperty("whitelistedPlayers") as string) ?? "[]");

    if (whitelistedPlayers.includes(playerName)) {
        player.sendMessage("§2[§7Paradox§2]§o§7 You are exempt from local bans due to being whitelisted.");
        return;
    }

    const { maxRenderDistance } = player.clientSystemInfo;

    if (maxRenderDistance < 6 || maxRenderDistance > 96) {
        if (!bannedPlayers.includes(playerName)) {
            bannedPlayers.push(playerName);
            world.setDynamicProperty("bannedPlayers", JSON.stringify(bannedPlayers));
        }
        player.runCommand(`kick @s §o§7\n\nYour device does not meet the minimum requirements to join this world. You have been banned.`);
    }
}

/**
 * Checks an allowlist similar to the native one in BDS.
 * If the connecting player is not on the list, they get kicked.
 * @param {PlayerSpawnAfterEvent} event - The event object containing player spawn information.
 */
function allowList(event: PlayerSpawnAfterEvent) {
    const player = event.player;
    const playerName = player.name;
    const allowListData = world.getDynamicProperty("allowlistedPlayers");

    if (!allowListData) {
        return;
    }

    const allowListedPlayers: PlayerNameList = JSON.parse(allowListData as string) ?? [];

    if (allowListedPlayers.includes(playerName)) {
        player.sendMessage("§2[§7Paradox§2]§o§7 You are on the allow list, welcome.");
        return;
    }

    player.runCommand(`kick @s §o§7\n\nYou are not on the allow list.`);
}

/**
 * Checks if the player's platform is blocked.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function isPlatformBlocked(event: PlayerSpawnAfterEvent) {
    const player = event.player;

    const validate = player.getDynamicProperty("PlayerName") as string;

    if (!validate) {
        player.setDynamicProperty("PlayerName", player.name);
    }

    // Safely parse platformBlockSettings from paradoxModulesDB
    const platformBlockSettings: PlatformBlockSettings = paradoxModulesDB.get("platformBlock_settings") ?? {};

    const playerPlatform = player.clientSystemInfo.platformType.toLowerCase();

    if (!playerPlatform || platformBlockSettings[playerPlatform]) {
        player.runCommand(`kick @s §o§7\n\nThis platform is not authorized!`);
    }
}

/**
 * Checks if a player is banned during their spawn event.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function handleBanCheck(event: PlayerSpawnAfterEvent) {
    const player = event.player;
    const playerName = player.name;

    const bannedPlayers: PlayerNameList = JSON.parse((world.getDynamicProperty("bannedPlayers") as string) ?? "[]");
    const whitelistedPlayers: PlayerNameList = JSON.parse((world.getDynamicProperty("whitelistedPlayers") as string) ?? "[]");
    const opsecData: SecurityClearanceData = JSON.parse((world.getDynamicProperty("paradoxOPSEC") as string) ?? "{}");

    // Always allow the host in
    if (opsecData.host?.id === player.id) {
        if (bannedPlayers.includes(playerName)) {
            const updated = bannedPlayers.filter((name) => name !== playerName);
            world.setDynamicProperty("bannedPlayers", JSON.stringify(updated));
            player.sendMessage("§2[§7Paradox§2]§o§7 You are the host and cannot be banned.");
        }
        return;
    }

    // Whitelisted players get unbanned
    if (bannedPlayers.includes(playerName)) {
        if (whitelistedPlayers.includes(playerName)) {
            const updated = bannedPlayers.filter((name) => name !== playerName);
            world.setDynamicProperty("bannedPlayers", JSON.stringify(updated));
            player.sendMessage("§2[§7Paradox§2]§o§7 You have been removed from the ban list due to being whitelisted.");
        } else {
            player.runCommand(`kick @s §o§7\n\nYou are banned. Please contact an admin for more information.`);
        }
    }
}

/**
 * Handles security clearance during player spawn.
 * Ensures the player's security clearance is set correctly and updated as needed.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function handleSecurityClearance(event: PlayerSpawnAfterEvent) {
    const player = event.player;
    const DEFAULT_CLEARANCE = 1;
    const MAX_CLEARANCE = 4;

    let playerClearance = player.getDynamicProperty("securityClearance") as number;

    // Ensure player clearance is valid
    if (!playerClearance || playerClearance < DEFAULT_CLEARANCE || playerClearance > MAX_CLEARANCE) {
        player.setDynamicProperty("securityClearance", DEFAULT_CLEARANCE);
        playerClearance = DEFAULT_CLEARANCE;
    }

    // Safely parse security clearance data from dynamic properties
    const securityClearanceData: SecurityClearanceData = JSON.parse((world.getDynamicProperty("paradoxOPSEC") as string) ?? "{}");

    // Skip if the player is the host
    if (securityClearanceData.host?.id === player.id) {
        return;
    }

    // Handle max security clearance logic
    if (playerClearance === MAX_CLEARANCE) {
        const isInSecurityList = securityClearanceData.securityClearanceList.some((info) => info.id === player.id);

        if (!isInSecurityList) {
            player.setDynamicProperty("securityClearance", DEFAULT_CLEARANCE);
        }
    }
}
