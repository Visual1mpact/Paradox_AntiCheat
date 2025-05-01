import { Player, PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { allowlistDB, banlistDB, paradoxModulesDB, spoofDB, whitelistDB } from "../event-listeners/world-initialize";
import { buildPrison, freezePlayer, PRISON_LOCATION_PROPERTY } from "../commands/moderation/freeze";

/**
 * Represents stored identity data for a trusted player.
 */
interface TrustedPlayerData {
    /**
     * The name originally associated with this ID.
     */
    name: string;

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
 * One-time migration function to move legacy spoof protection data to the new format.
 *
 * Legacy format:
 * - Each player record was stored under their name as a top-level key in the database.
 *
 * New format:
 * - All player records are stored under a single "players" key as a dictionary of name-to-data entries.
 *
 * This function:
 * - Skips if `_migrationDone` is set to true.
 * - Converts all valid legacy entries into the new structure.
 * - Deletes invalid or corrupted entries.
 * - Removes the original per-name keys after migration.
 * - Sets `_migrationDone` to true to prevent re-execution.
 *
 * This should be called once at the start of `handleSpoofCheck()` and can be safely removed afterward.
 */
function migrateLegacySpoofData() {
    if (spoofDB.get<boolean>("_migrationDone")) return;

    const allPlayers = spoofDB.get<Record<string, TrustedPlayerData>>("players") ?? {};
    const now = Date.now();

    for (const [key, value] of spoofDB.entries()) {
        if (key === "players" || key === "_migrationDone") continue;

        const record = value as Partial<TrustedPlayerData>;

        // Skip and delete invalid entries
        if (!record?.id || typeof record.lastSeen !== "number") {
            spoofDB.delete(key);
            continue;
        }

        allPlayers[key] = {
            id: record.id,
            name: key, // Legacy key is the player name
            firstSeen: record.firstSeen ?? now,
            lastSeen: record.lastSeen,
            spoofAttempts: record.spoofAttempts ?? [],
        };

        spoofDB.delete(key);
    }

    spoofDB.set("players", allPlayers);
    spoofDB.set("_migrationDone", true); // mark migration complete
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
    migrateLegacySpoofData(); // runs only once ever

    const now = Date.now();
    const nameKey = player.name;
    const STALE_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

    const allPlayers = spoofDB.get<Record<string, TrustedPlayerData>>("players") ?? {};
    const staleKeys: string[] = [];
    const corruptedKeys: string[] = [];

    // Detect ID conflicts and stale/corrupt entries
    for (const [storedName, record] of Object.entries(allPlayers)) {
        if (!record?.id || typeof record.lastSeen !== "number") {
            corruptedKeys.push(storedName);
            continue;
        }
        if (now - record.lastSeen >= STALE_THRESHOLD) {
            staleKeys.push(storedName);
        }
        if (record.id === player.id && storedName !== nameKey) {
            player.sendMessage(`§c[Paradox] Your ID is already associated with the name "${storedName}".`);
            player.runCommand(`kick @s §o§7\n\nName change is not allowed on this server.`);
            return;
        }
    }

    // Remove corrupted/stale keys
    [...corruptedKeys, ...staleKeys].forEach((key) => delete allPlayers[key]);

    const existing = allPlayers[nameKey];

    if (!existing) {
        allPlayers[nameKey] = {
            name: player.name,
            id: player.id,
            firstSeen: now,
            lastSeen: now,
        };
        spoofDB.set("players", allPlayers);
        return;
    }

    if (existing.id !== player.id) {
        // Spoof detected
        const attempt = { id: player.id, timestamp: now };
        if (!existing.spoofAttempts) existing.spoofAttempts = [];
        existing.spoofAttempts.push(attempt);
        existing.lastSeen = now;

        allPlayers[nameKey] = existing;
        spoofDB.set("players", allPlayers);

        player.sendMessage(`§c[Paradox] Name spoof detected. This name belongs to another player.`);
        player.runCommand(`kick @s §o§7\n\nSpoofing is not allowed.`);
        return;
    }

    // Valid login — update timestamp
    existing.lastSeen = now;
    allPlayers[nameKey] = existing;
    spoofDB.set("players", allPlayers);
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
    const bannedPlayers = banlistDB.get<string[]>("players") ?? [];
    const whitelistedPlayers = whitelistDB.get<string[]>("players") ?? [];

    if (whitelistedPlayers.includes(playerName)) {
        player.sendMessage("§2[§7Paradox§2]§o§7 You are exempt from local bans due to being whitelisted.");
        return;
    }

    const { maxRenderDistance } = player.clientSystemInfo;

    if (maxRenderDistance < 6 || maxRenderDistance > 96) {
        if (!bannedPlayers.includes(playerName)) {
            bannedPlayers.push(playerName);
            banlistDB.set("players", bannedPlayers);
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

    const allowListedPlayers = allowlistDB.get<string[]>("players") ?? [];

    if (!allowListedPlayers.length) {
        return;
    }

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

    const bannedPlayers = banlistDB.get<string[]>("players") ?? [];
    const whitelistedPlayers = whitelistDB.get<string[]>("players") ?? [];
    const opsecData: SecurityClearanceData = JSON.parse((world.getDynamicProperty("paradoxOPSEC") as string) ?? "{}");

    // Always allow the host in
    if (opsecData.host?.id === player.id) {
        if (bannedPlayers.includes(playerName)) {
            const updated = bannedPlayers.filter((name) => name !== playerName);
            banlistDB.set("players", updated);
            player.sendMessage("§2[§7Paradox§2]§o§7 You are the host and cannot be banned.");
        }
        return;
    }

    // Whitelisted players get unbanned
    if (bannedPlayers.includes(playerName)) {
        if (whitelistedPlayers.includes(playerName)) {
            const updated = bannedPlayers.filter((name) => name !== playerName);
            banlistDB.set("players", updated);
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
