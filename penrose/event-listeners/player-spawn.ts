import { Player, PlayerSpawnAfterEvent, system, Vector3, world } from "@minecraft/server";
import { allowlistDB, banlistDB, paradoxModulesDB, whitelistDB, warnsDB, playerMetadataDB } from "../event-listeners/world-initialize";
import { buildPrison, freezePlayer, PRISON_LOCATION_PROPERTY } from "../commands/moderation/freeze";
import { PlatformBlockSettings, WarningEntry } from "../classes/database/db-types";
import { EventCoordinator } from "../classes/core/event-coordinator";
import { PlayerLocationCache } from "../classes/cache/player-location-cache";

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
 * Updates the player's name tag and forces a location sync if changed.
 *
 * @param {Player} player - The target player.
 */
function updatePlayerNameTag(player: Player): void {
    const targetTag = computeTargetNameTag(player);

    if (player.nameTag !== targetTag) {
        system.run(() => {
            player.nameTag = targetTag;
            const transform = PlayerLocationCache.getTransform(player);
            const loc = transform?.location ?? player.location;
            const dim = transform?.dimension ?? player.dimension;
            player.teleport(loc, { dimension: dim }); // force client sync
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

    const transform = PlayerLocationCache.getTransform(player);
    const loc = transform?.location ?? player.location;

    if (isOutsidePrisonBounds(loc, prisonLocation)) {
        buildPrison(player); // rebuild walls if needed
        freezePlayer(player); // freeze again
        player.sendMessage(`§2[§7Paradox§2]§o§7 You were returned to your prison after respawn.`);
    }
}

/**
 * Handles player spawn events.
 * This function is triggered when a player spawns in the world.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 * @returns {Promise<void>}
 */
async function handlePlayerSpawn(event: PlayerSpawnAfterEvent): Promise<void> {
    const player = event.player;

    if (event.initialSpawn) {
        await checkMemoryAndRenderDistance(event);
        isPlatformBlocked(event);
        await handleBanCheck(event);
        await handleWarnCheck(event);
        handleSecurityClearance(event);
        await allowList(event);
        await handleMetadataUpdate(player);
        updatePlayerNameTag(player);
    }

    handlePrisonEnforcement(player);
}

/**
 * Checks the player's memoryTier and maxRenderDistance.
 * If the device is suspicious or non-compliant, the player will be banned and kicked.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 * @returns {Promise<void>}
 */
async function checkMemoryAndRenderDistance(event: PlayerSpawnAfterEvent): Promise<void> {
    const player = event.player;
    const playerName = player.name;

    const bannedPlayers = (await banlistDB.get("players")) ?? {};
    const whitelistedPlayers = (await whitelistDB.get("players")) ?? {};

    // Whitelisted players are exempt
    if (playerName in whitelistedPlayers) {
        player.sendMessage("§2[§7Paradox§2]§o§7 You are exempt from local bans due to being whitelisted.");
        return;
    }

    const { maxRenderDistance, platformType, memoryTier } = player.clientSystemInfo;

    const invalidRenderDistance = maxRenderDistance == null || Number.isNaN(maxRenderDistance) || maxRenderDistance < 6 || maxRenderDistance > 96;

    const invalidMemory = (platformType === "Desktop" && memoryTier === 0) || (platformType === "Console" && memoryTier <= 1);

    if (invalidRenderDistance || invalidMemory) {
        if (!bannedPlayers[playerName]) {
            bannedPlayers[playerName] = {
                reason: "Invalid device specifications (render distance)",
                bannedBy: "System",
                timestamp: Date.now(),
            };

            await banlistDB.set("players", bannedPlayers);
        }

        player.runCommand(`kick @s Your device does not meet the minimum requirements to join this world. You have been banned.`);
    }
}

/**
 * Checks an allowlist similar to the native implementation in BDS.
 * If the connecting player is not on the list, they are disconnected.
 *
 * @param {PlayerSpawnAfterEvent} event - The event object containing player spawn information.
 * @returns {Promise<void>} Resolves when access check completes.
 */
async function allowList(event: PlayerSpawnAfterEvent): Promise<void> {
    const player = event.player;
    const playerName = player.name;
    const allowListedPlayers = (await allowlistDB.get("players")) ?? {};

    // If no allowlist is enforced, allow access
    if (Object.keys(allowListedPlayers).length === 0) return;

    // Retrieve host configuration data
    const opsecData: SecurityClearanceData = JSON.parse((world.getDynamicProperty("paradoxOPSEC") as string) ?? "{}");

    // Always grant access to the host
    if (opsecData.host?.id === player.id) {
        player.sendMessage(`§2[§7Paradox§2]§o§7 Host privilege authenticated. Welcome, ${playerName}.`);
        return;
    }

    // Verify player presence on allowlist
    if (playerName in allowListedPlayers) {
        player.sendMessage(`§2[§7Paradox§2]§o§7 Access granted. Welcome back, ${playerName}.`);
        return;
    }

    // Disconnect unauthorized player
    player.runCommand(`kick @s Access denied: You are not on the allowlist.`);
}

/**
 * List of all recognized platform keys used in PlatformBlockSettings.
 */
const validPlatforms = ["console", "desktop", "mobile"] as const;
type ValidPlatform = (typeof validPlatforms)[number];

/**
 * Type guard to check if a string is a valid platform key.
 */
function isValidPlatform(key: string): key is ValidPlatform {
    return validPlatforms.includes(key as ValidPlatform);
}

/**
 * Kicks players whose platform is blocked in configured module settings.
 * @param {PlayerSpawnAfterEvent} event - The event containing player spawn info.
 */
async function isPlatformBlocked(event: PlayerSpawnAfterEvent): Promise<void> {
    const player = event.player;

    // Ensure spoof tracking property exists
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

    // Use type guard to safely index into settings
    if (platform && isValidPlatform(platform) && settings[platform]) {
        player.runCommand(`kick @s This platform is not authorized!`);
    }
}

/**
 * Checks if a player is banned during their spawn event.
 * If the player is the host or whitelisted, they are removed from the ban list.
 * Otherwise, banned players are kicked.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 * @returns {Promise<void>}
 */
async function handleBanCheck(event: PlayerSpawnAfterEvent): Promise<void> {
    const player = event.player;
    const playerName = player.name;

    const bannedPlayers = (await banlistDB.get("players")) ?? {};
    const whitelistedPlayers = (await whitelistDB.get("players")) ?? {};
    const opsecData: SecurityClearanceData = JSON.parse(((await world.getDynamicProperty("paradoxOPSEC")) as string) ?? "{}");

    // Always allow the host in, remove them from banlist if needed
    if (opsecData.host?.id === player.id) {
        if (playerName in bannedPlayers) {
            delete bannedPlayers[playerName];
            await banlistDB.set("players", bannedPlayers);
            player.sendMessage("§2[§7Paradox§2]§o§7 You are the host and cannot be banned.");
        }
        return;
    }

    // If the player is banned
    if (playerName in bannedPlayers) {
        // If also whitelisted, unban them
        if (playerName in whitelistedPlayers) {
            delete bannedPlayers[playerName];
            await banlistDB.set("players", bannedPlayers);
            player.sendMessage("§2[§7Paradox§2]§o§7 You have been removed from the ban list due to being whitelisted.");
        } else {
            // Otherwise, kick the player
            player.runCommand(`kick @s You are banned. Please contact an admin for more information.`);
        }
    }
}

/**
 * Checks if a player has reached the warning threshold and kicks them if they have.
 * This enforces the 3-warning limit upon rejoining, effectively suspending the player.
 * @param {PlayerSpawnAfterEvent} event - The event object.
 */
async function handleWarnCheck(event: PlayerSpawnAfterEvent): Promise<void> {
    const player = event.player;
    const playerName = player.name;

    // Level 4 administrators are exempt from automated warning kicks
    const clearance = player.getDynamicProperty("securityClearance") as number;
    if (clearance === 4) return;

    const allWarns = (await warnsDB.get("players")) ?? {};
    const playerWarns: WarningEntry[] = allWarns[playerName] ?? [];

    if (playerWarns.length >= 3) {
        player.runCommand(`kick @s Automatic Kick: Too many warnings (${playerWarns.length}/3). Appeal to an admin.`);
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

    let playerClearance = player.getDynamicProperty("securityClearance") as number | undefined;

    // If clearance is missing or out of bounds, default to Level 1
    if (playerClearance === undefined || playerClearance < DEFAULT_CLEARANCE || playerClearance > MAX_CLEARANCE) {
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
