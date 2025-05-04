import { Player, PlayerSpawnAfterEvent, system, world } from "@minecraft/server";
import { allowlistDB, banlistDB, paradoxModulesDB, spoofDB, whitelistDB } from "../event-listeners/world-initialize";
import { buildPrison, freezePlayer, PRISON_LOCATION_PROPERTY } from "../commands/moderation/freeze";

/**
 * Data model for a trusted player stored in the spoof detection system.
 */
interface TrustedPlayerData {
    /** Unique identifier for the player */
    id: string;
    /** List of known usernames used by this player */
    knownNames: string[];
    /** Timestamp of when this player was first seen */
    firstSeen: number;
    /** Timestamp of when this player was last seen */
    lastSeen: number;
    /**
     * History of spoof attempts made using this player’s identity.
     * Each entry contains the spoofed name and the time it occurred.
     */
    spoofAttempts?: {
        /** Name used during the spoof attempt */
        name: string;
        /** Timestamp of the spoof attempt */
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
 */
function migrateLegacySpoofData() {
    const alreadyMigrated = spoofDB.get<boolean>("_migrationDone");
    if (alreadyMigrated) return;

    const data = spoofDB.get<Record<string, TrustedPlayerData>>("players");
    if (!data || typeof data !== "object") {
        spoofDB.set("_migrationDone", true);
        return;
    }

    let migrated = false;

    for (const [key, value] of Object.entries(data)) {
        const isLegacy = typeof key === "string" && typeof value === "object" && value !== null && typeof value.id === "string" && typeof value.firstSeen === "number";

        if (!isLegacy) continue;

        const legacyName = key;
        const { id, firstSeen, lastSeen, spoofAttempts } = value;
        const newKey = id;

        const existing = data[newKey];

        if (existing) {
            if (!existing.knownNames.includes(legacyName)) {
                existing.knownNames.push(legacyName);
            }

            existing.firstSeen = Math.min(existing.firstSeen, firstSeen);
            existing.lastSeen = Math.max(existing.lastSeen, lastSeen);

            if (Array.isArray(spoofAttempts) && (!Array.isArray(existing.spoofAttempts) || spoofAttempts.length > existing.spoofAttempts.length)) {
                existing.spoofAttempts = spoofAttempts;
            }
        } else {
            data[newKey] = {
                id,
                knownNames: [legacyName],
                firstSeen,
                lastSeen,
                spoofAttempts,
            };
        }

        delete data[legacyName];
        migrated = true;
    }

    if (migrated) {
        spoofDB.set("players", data);
    }

    spoofDB.set("_migrationDone", true);
}

/**
 * Checks and validates the identity of a player joining the world, enforcing consistent name-ID mapping.
 *
 * This function ensures that each player ID is uniquely tied to a set of known names, preventing name spoofing:
 *
 * - If the player's ID is new, it creates a new record and registers their current name.
 * - If the ID exists but the name is new, it is added to the list of known names for that ID.
 * - If another ID has previously used this name, the current player is considered a spoofer and is kicked.
 * - Records that are stale (older than 7 days) or corrupted are automatically purged.
 * - The spoof record is updated with the last seen timestamp and any spoof attempts.
 *
 * Migration from older spoof data formats is handled automatically and only once.
 *
 * @param {Player} player - The player instance that has joined or spawned in the world.
 */
function handleSpoofCheck(player: Player) {
    migrateLegacySpoofData(); // runs only once ever

    const now = Date.now();
    const idKey = player.id;
    const name = player.name;
    const STALE_THRESHOLD = 7 * 24 * 60 * 60 * 1000;

    const allPlayers = spoofDB.get<Record<string, TrustedPlayerData>>("players") ?? {};
    const staleIDs: string[] = [];
    const corruptedIDs: string[] = [];

    // Cleanup pass
    for (const [storedID, record] of Object.entries(allPlayers)) {
        if (!record?.id || typeof record.lastSeen !== "number") {
            corruptedIDs.push(storedID);
            continue;
        }
        if (now - record.lastSeen >= STALE_THRESHOLD) {
            staleIDs.push(storedID);
        }
    }

    [...staleIDs, ...corruptedIDs].forEach((id) => delete allPlayers[id]);

    const existing = allPlayers[idKey];

    if (!existing) {
        allPlayers[idKey] = {
            id: player.id,
            knownNames: [name],
            firstSeen: now,
            lastSeen: now,
        };
        spoofDB.set("players", allPlayers);
        return;
    }

    // Add the current name to knownNames if new
    if (!existing.knownNames.includes(name)) {
        existing.knownNames.push(name);
    }

    existing.lastSeen = now;

    // Check for name spoofing (other players using a name that belongs to this ID)
    for (const [otherID, record] of Object.entries(allPlayers)) {
        if (otherID === idKey) continue;

        if (record.knownNames.includes(name)) {
            if (!record.spoofAttempts) record.spoofAttempts = [];
            record.spoofAttempts.push({ name, timestamp: now });

            spoofDB.set("players", allPlayers);
            player.sendMessage(`§c[Paradox] Spoof attempt detected. This name is used by another account.`);
            player.runCommand(`kick @s §o§7\n\nSpoofing is not allowed.`);
            return;
        }
    }

    allPlayers[idKey] = existing;
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

        // Logic for setting the nameTag with chat rank
        const playerRank = (player.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";
        if (!player.nameTag?.startsWith(playerRank)) {
            const performNameTagUpdate = async () => {
                player.nameTag = `${playerRank}§r ${player.name}`;
                player.teleport(player.location, { dimension: player.dimension }); // Force client sync
            };
            system.run(performNameTagUpdate);
        }
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
