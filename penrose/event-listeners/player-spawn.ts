import { Player, PlayerSpawnAfterEvent, system, Vector3, world } from "@minecraft/server";
import { allowlistDB, banlistDB, paradoxModulesDB, whitelistDB, warnsDB, playerMetadataDB } from "../event-listeners/world-initialize";
import { buildPrison, freezePlayer, PRISON_LOCATION_PROPERTY } from "../commands/moderation/freeze";
import {
    AllowlistPlayersSchema,
    BanlistPlayersSchema,
    ListPlayerDictionary,
    ListPlayerRecord,
    PlatformBlockSettings,
    PlayerWarnData,
} from "../types/db-types";
import { EventCoordinator } from "../classes/core/event-coordinator";

// Mapping key types to database store shapes
interface CacheSchemaMap {
    whitelist: ListPlayerDictionary;
    banlist: BanlistPlayersSchema["players"];
    allowlist: AllowlistPlayersSchema["players"];
    warns: PlayerWarnData;
}

// Strongly typed in-memory cache store based on db-types schemas
interface DBCacheStore {
    whitelist: ListPlayerDictionary | null;
    banlist: BanlistPlayersSchema["players"] | null;
    allowlist: AllowlistPlayersSchema["players"] | null;
    warns: PlayerWarnData | null;
    lastFetch: number;
}

const dbCache: DBCacheStore = {
    whitelist: null,
    banlist: null,
    allowlist: null,
    warns: null,
    lastFetch: 0,
};

// Cache TTL in milliseconds (5 seconds) to balance low-latency reads with database sync
const CACHE_TTL = 5000;

interface PlayerInfo {
    name: string;
    id: string;
}

interface SecurityClearanceData {
    host?: PlayerInfo;
    securityClearanceList: PlayerInfo[];
}

/**
 * Helper to get cached database records or fetch them if cache is stale/empty.
 * Uses strict generic constraints to align with OptimizedDatabase key requirements.
 */
async function getCachedDB<
    K extends keyof CacheSchemaMap,
    DBKey extends string,
    DBInstance extends { get: (k: DBKey) => Promise<CacheSchemaMap[K] | undefined> }
>(
    key: K,
    dbInstance: DBInstance,
    dbKey: DBKey
): Promise<CacheSchemaMap[K]> {
    const now = Date.now();
    if (!dbCache[key] || now - dbCache.lastFetch > CACHE_TTL) {
        const fetched = (await dbInstance.get(dbKey)) ?? ({} as CacheSchemaMap[K]);
        dbCache[key] = fetched as DBCacheStore[K] & CacheSchemaMap[K];
        dbCache.lastFetch = now;
    }
    return dbCache[key] as CacheSchemaMap[K];
}

/**
 * Function to execute when a player spawns.
 * Initializes event handlers for player spawn events.
 */
export function onPlayerSpawn(): void {
    initializeEventHandlers();
}

/**
 * Function to initialize event handlers for player spawn events.
 */
function initializeEventHandlers(): void {
    EventCoordinator.subscribeAfter("playerSpawn", handlePlayerSpawn);
}

/**
 * Captures and persists player metadata (Platform, Join Date) to the database.
 * Hot-loads these values into dynamic properties for low-latency command access.
 *
 * @param {Player} player - The player to update.
 */
async function handleMetadataUpdate(player: Player): Promise<void> {
    const id = player.id;
    const platform: string = player.clientSystemInfo.platformType ?? "Unknown";
    const now = Date.now();

    const metadata = (await playerMetadataDB.get(id)) ?? {
        joinDate: new Date(now).toLocaleDateString("en-GB", { dateStyle: "medium" }),
        firstPlatform: platform,
        firstJoined: now,
        lastPlatform: platform,
        lastSeen: now,
    };

    metadata.lastPlatform = platform;
    metadata.lastSeen = now;

    await playerMetadataDB.set(id, metadata);

    // Sync to dynamic properties for the :whois command
    player.setDynamicProperty("platform", platform);
    player.setDynamicProperty("joinDate", metadata.joinDate);
}

/**
 * Resolves the appropriate nameTag for a player based on rank, alias, and global rank settings.
 *
 * @param {Player} player - The target player.
 * @returns {string} The computed target name tag string.
 */
function computeTargetNameTag(player: Player): string {
    const rank = (player.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";
    const alias = player.getDynamicProperty("paradoxAlias") as string | undefined;
    const showAliasInUI = (player.getDynamicProperty("showAliasInUI") as boolean) ?? false;
    const displayName = alias && showAliasInUI ? alias : player.name;

    const rankedTag = `${rank}§r ${displayName}`;
    const plainTag = displayName;
    const ranksDisabled = !!world.getDynamicProperty("globalRankDisabled");

    if (ranksDisabled) {
        return player.nameTag === rankedTag ? plainTag : player.nameTag;
    }

    return rankedTag;
}

/**
 * Updates the player's name tag without forcing an unnecessary teleport packet.
 *
 * @param {Player} player - The target player.
 */
function updatePlayerNameTag(player: Player): void {
    const targetTag = computeTargetNameTag(player);

    if (player.nameTag !== targetTag) {
        system.run(() => {
            player.nameTag = targetTag;
        });
    }
}

/**
 * Checks if a player's coordinates lie outside their designated prison volume.
 *
 * @param {Vector3} playerLoc - Current 3D position of the player.
 * @param {Vector3} prisonLoc - Base 3D position of the prison.
 * @returns {boolean} True if the player is outside prison bounds; otherwise false.
 */
function isOutsidePrisonBounds(playerLoc: Vector3, prisonLoc: Vector3): boolean {
    const PRISON_WIDTH = 5;
    const PRISON_HEIGHT = 4;
    const PRISON_DEPTH = 5;

    const insideX = playerLoc.x >= prisonLoc.x && playerLoc.x < prisonLoc.x + PRISON_WIDTH;
    const insideZ = playerLoc.z >= prisonLoc.z && playerLoc.z < prisonLoc.z + PRISON_DEPTH;
    const insideY = playerLoc.y >= prisonLoc.y + 1 && playerLoc.y < prisonLoc.y + PRISON_HEIGHT;

    return !(insideX && insideY && insideZ);
}

/**
 * Verifies and enforces prison restrictions if the player has an active prison location set.
 *
 * @param {Player} player - The target player.
 */
function handlePrisonEnforcement(player: Player): void {
    const prisonLocation = player.getDynamicProperty(PRISON_LOCATION_PROPERTY) as Vector3 | undefined;
    if (!prisonLocation) return;

    const loc = player.location;

    if (isOutsidePrisonBounds(loc, prisonLocation)) {
        system.run(() => {
            buildPrison(player);
            freezePlayer(player);
            player.sendMessage(`§2[§7Paradox§2]§o§7 You were returned to your prison after respawn.`);
        });
    }
}

/**
 * Validates player presence on the whitelist and migrates legacy ID schema or missing IDs on the fly.
 *
 * @param {string} playerName - Target player name key.
 * @param {string} playerId - Target player runtime identifier.
 * @returns {Promise<boolean>} True if the player is authenticated against the whitelist.
 */
async function isWhitelisted(playerName: string, playerId: string): Promise<boolean> {
    const whitelistedPlayers = await getCachedDB("whitelist", whitelistDB, "players");
    const record = whitelistedPlayers[playerName];

    if (!record) return false;

    const legacyRecord = record as ListPlayerRecord & { ID?: string | null };
    const targetId = record.id ?? legacyRecord.ID;

    if (!targetId || "ID" in legacyRecord) {
        if ("ID" in legacyRecord) delete legacyRecord.ID;
        record.id = playerId;
        await whitelistDB.set("players", whitelistedPlayers);
        dbCache.whitelist = whitelistedPlayers;
    }

    return targetId === playerId;
}

/**
 * Checks the player's memoryTier and maxRenderDistance.
 *
 * @param {Player} player - The target player entity.
 * @returns {Promise<void>}
 */
async function checkMemoryAndRenderDistance(player: Player): Promise<void> {
    const playerName = player.name;

    if (await isWhitelisted(playerName, player.id)) {
        player.sendMessage("§2[§7Paradox§2]§o§7 You are exempt from local bans due to being whitelisted.");
        return;
    }

    const { maxRenderDistance, platformType, memoryTier } = player.clientSystemInfo;

    const invalidRenderDistance = maxRenderDistance == null || Number.isNaN(maxRenderDistance) || maxRenderDistance < 6 || maxRenderDistance > 96;
    const invalidMemory = (platformType === "Desktop" && memoryTier === 0) || (platformType === "Console" && memoryTier <= 1);

    if (invalidRenderDistance || invalidMemory) {
        const bannedPlayers = await getCachedDB("banlist", banlistDB, "players");

        if (!bannedPlayers[playerName]) {
            bannedPlayers[playerName] = {
                reason: "Invalid device specifications (render distance)",
                bannedBy: "System",
                timestamp: Date.now(),
            };

            await banlistDB.set("players", bannedPlayers);
            dbCache.banlist = bannedPlayers;
        }

        player.runCommand(`kick @s Your device does not meet the minimum requirements to join this world. You have been banned.`);
    }
}

/**
 * Checks an allowlist similar to the native implementation in BDS.
 *
 * @param {Player} player - The target player entity.
 * @returns {Promise<void>}
 */
async function allowList(player: Player): Promise<void> {
    const playerName = player.name;
    const allowListedPlayers = await getCachedDB("allowlist", allowlistDB, "players");

    if (Object.keys(allowListedPlayers).length === 0) return;

    const opsecData: SecurityClearanceData = JSON.parse((world.getDynamicProperty("paradoxOPSEC") as string) ?? "{}");

    if (opsecData.host?.id === player.id) {
        player.sendMessage(`§2[§7Paradox§2]§o§7 Host privilege authenticated. Welcome, ${playerName}.`);
        return;
    }

    const record = allowListedPlayers[playerName];

    if (record) {
        const legacyRecord = record as ListPlayerRecord & { ID?: string | null };
        const targetId = record.id ?? legacyRecord.ID;

        if (!targetId || targetId === player.id) {
            if ("ID" in legacyRecord) delete legacyRecord.ID;
            record.id = player.id;
            await allowlistDB.set("players", allowListedPlayers);
            dbCache.allowlist = allowListedPlayers;

            player.sendMessage(`§2[§7Paradox§2]§o§7 Access granted. Welcome back, ${playerName}.`);
            return;
        }
    }

    player.runCommand(`kick @s Access denied: You are not on the allowlist.`);
}

const validPlatforms = ["console", "desktop", "mobile"] as const;
type ValidPlatform = (typeof validPlatforms)[number];

function isValidPlatform(key: string): key is ValidPlatform {
    return validPlatforms.includes(key as ValidPlatform);
}

/**
 * Kicks players whose platform is blocked in configured module settings.
 *
 * @param {Player} player - The target player entity.
 */
async function isPlatformBlocked(player: Player): Promise<void> {
    if (!player.getDynamicProperty("PlayerName")) {
        player.setDynamicProperty("PlayerName", player.name);
    }

    const platformModule = await paradoxModulesDB.get("platformBlock_b");
    if (!platformModule?.enabled) return;

    const settings: PlatformBlockSettings = platformModule.settings ?? {
        console: false,
        desktop: false,
        mobile: false,
    };

    const platform = player.clientSystemInfo.platformType?.toLowerCase();

    if (platform && isValidPlatform(platform) && settings[platform]) {
        player.runCommand(`kick @s This platform is not authorized!`);
    }
}

/**
 * Checks if a player is banned during their spawn event.
 *
 * @param {Player} player - The target player entity.
 * @returns {Promise<void>}
 */
async function handleBanCheck(player: Player): Promise<void> {
    const playerName = player.name;
    const bannedPlayers = await getCachedDB("banlist", banlistDB, "players");
    const opsecData: SecurityClearanceData = JSON.parse(((await world.getDynamicProperty("paradoxOPSEC")) as string) ?? "{}");

    if (opsecData.host?.id === player.id) {
        if (playerName in bannedPlayers) {
            delete bannedPlayers[playerName];
            await banlistDB.set("players", bannedPlayers);
            dbCache.banlist = bannedPlayers;
            player.sendMessage("§2[§7Paradox§2]§o§7 You are the host and cannot be banned.");
        }
        return;
    }

    if (playerName in bannedPlayers) {
        if (await isWhitelisted(playerName, player.id)) {
            delete bannedPlayers[playerName];
            await banlistDB.set("players", bannedPlayers);
            dbCache.banlist = bannedPlayers;
            player.sendMessage("§2[§7Paradox§2]§o§7 You have been removed from the ban list due to being whitelisted.");
        } else {
            player.runCommand(`kick @s You are banned. Please contact an admin for more information.`);
        }
    }
}

/**
 * Checks if a player has reached the warning threshold and kicks them if they have.
 *
 * @param {Player} player - The target player entity.
 */
async function handleWarnCheck(player: Player): Promise<void> {
    const playerName = player.name;
    const clearance = player.getDynamicProperty("securityClearance") as number;
    if (clearance === 4) return;

    const allWarns = await getCachedDB("warns", warnsDB, "players");
    const playerWarns = allWarns[playerName] ?? [];

    if (playerWarns.length >= 3) {
        player.runCommand(`kick @s Automatic Kick: Too many warnings (${playerWarns.length}/3). Appeal to an admin.`);
    }
}

/**
 * Handles security clearance during player spawn.
 *
 * @param {Player} player - The target player entity.
 */
function handleSecurityClearance(player: Player): void {
    const DEFAULT_CLEARANCE = 1;
    const MAX_CLEARANCE = 4;

    let playerClearance = player.getDynamicProperty("securityClearance") as number | undefined;

    if (playerClearance === undefined || playerClearance < DEFAULT_CLEARANCE || playerClearance > MAX_CLEARANCE) {
        player.setDynamicProperty("securityClearance", DEFAULT_CLEARANCE);
        playerClearance = DEFAULT_CLEARANCE;
    }

    const securityClearanceData: SecurityClearanceData = JSON.parse((world.getDynamicProperty("paradoxOPSEC") as string) ?? "{}");

    if (securityClearanceData.host?.id === player.id) {
        return;
    }

    if (playerClearance === MAX_CLEARANCE) {
        const isInSecurityList = securityClearanceData.securityClearanceList.some((info) => info.id === player.id);

        if (!isInSecurityList) {
            player.setDynamicProperty("securityClearance", DEFAULT_CLEARANCE);
        }
    }
}

/**
 * Optimized player spawn handler utilizing Promise.all() to prevent tick slowdowns.
 *
 * @param {PlayerSpawnAfterEvent} event - The player spawn event payload.
 */
async function handlePlayerSpawn(event: PlayerSpawnAfterEvent): Promise<void> {
    const player = event.player;

    if (event.initialSpawn) {
        isPlatformBlocked(player);
        handleSecurityClearance(player);
        updatePlayerNameTag(player);

        await Promise.all([
            checkMemoryAndRenderDistance(player),
            handleBanCheck(player),
            handleWarnCheck(player),
            allowList(player),
            handleMetadataUpdate(player),
        ]);
    }

    handlePrisonEnforcement(player);
}
