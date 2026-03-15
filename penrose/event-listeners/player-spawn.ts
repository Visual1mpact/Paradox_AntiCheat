import { Player, PlayerSpawnAfterEvent, system, Vector3, world } from "@minecraft/server";
import { allowlistDB, banlistDB, paradoxModulesDB, spoofDB, whitelistDB } from "../event-listeners/world-initialize";
import { buildPrison, freezePlayer, PRISON_LOCATION_PROPERTY } from "../commands/moderation/freeze";
import { PlatformBlockSettings } from "../classes/database/db-types";

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
    world.afterEvents.playerSpawn.subscribe(handlePlayerSpawn);
}

/**
 * Checks and validates the identity of a player joining the world, enforcing consistent name-ID mapping.
 * Prevents name spoofing by ensuring ID-to-name mappings are unique and consistent.
 *
 * @param {Player} player - The player instance that has joined or spawned in the world.
 * @returns {Promise<void>}
 */
async function handleSpoofCheck(player: Player): Promise<void> {
    const now = Date.now();
    const idKey = player.id;
    const playerName = player.name;
    const STALE_THRESHOLD = 7 * 24 * 60 * 60 * 1000;

    const allPlayers = spoofDB.get("players") ?? {};
    const staleIDs: string[] = [];
    const corruptedIDs: string[] = [];

    // Cleanup stale or malformed records
    for (const [storedID, record] of Object.entries(allPlayers)) {
        if (typeof record !== "object" || typeof record.lastSeen !== "number" || !Array.isArray(record.knownNames)) {
            corruptedIDs.push(storedID);
            continue;
        }

        if (now - record.lastSeen >= STALE_THRESHOLD) {
            staleIDs.push(storedID);
        }
    }

    // Remove stale and corrupted records
    [...staleIDs, ...corruptedIDs].forEach((id) => delete allPlayers[id]);

    let existing = allPlayers[idKey];

    // New player record
    if (!existing) {
        allPlayers[idKey] = {
            name: playerName, // store with lowercase property
            knownNames: [playerName],
            firstSeen: now,
            lastSeen: now,
        };
        await spoofDB.set("players", allPlayers);
        return;
    }

    // Update existing player record
    if (!existing.knownNames.includes(playerName)) {
        existing.knownNames.push(playerName);
    }
    existing.lastSeen = now;

    // Check for spoofing: another ID already claimed this name
    for (const [otherID, record] of Object.entries(allPlayers)) {
        if (otherID === idKey) continue;

        if (record.knownNames.includes(playerName)) {
            record.spoofAttempts ??= [];
            record.spoofAttempts.push({ name: playerName, timestamp: now });

            await spoofDB.set("players", allPlayers);

            player.sendMessage(`§o§c[Paradox] Spoof attempt detected. This name is used by another account.`);
            player.runCommand(`kick @s Spoofing is not allowed.`);
            return;
        }
    }

    // Commit updates to the database
    allPlayers[idKey] = existing;
    await spoofDB.set("players", allPlayers);
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
        handleSecurityClearance(event);
        allowList(event);

        // Logic for setting the nameTag with chat rank
        const rank = (player.getDynamicProperty("chatRank") as string) ?? "§2[§7Member§2]";
        const rankedTag = `${rank}§r ${player.name}`;
        const plainTag = player.name;

        const ranksDisabled = !!world.getDynamicProperty("globalRankDisabled");

        let targetTag: string;

        if (ranksDisabled) {
            // Only strip if the tag is exactly the one Paradox would set
            targetTag = player.nameTag === rankedTag ? plainTag : player.nameTag;
        } else {
            targetTag = rankedTag;
        }

        if (player.nameTag !== targetTag) {
            system.run(() => {
                player.nameTag = targetTag;
                player.teleport(player.location, { dimension: player.dimension }); // force client sync
            });
        }
    }

    // They can change their name at any given time so lets check whenever they spawn
    await handleSpoofCheck(player);

    const prisonLocation = player.getDynamicProperty(PRISON_LOCATION_PROPERTY) as Vector3 | undefined;
    if (prisonLocation) {
        // Only rebuild/freeze if the player is outside their prison bounds
        const px = player.location.x;
        const py = player.location.y;
        const pz = player.location.z;

        const PRISON_WIDTH = 5;
        const PRISON_HEIGHT = 4;
        const PRISON_DEPTH = 5;

        const insideX = px >= prisonLocation.x && px < prisonLocation.x + PRISON_WIDTH;
        const insideZ = pz >= prisonLocation.z && pz < prisonLocation.z + PRISON_DEPTH;
        const insideY = py >= prisonLocation.y + 1 && py < prisonLocation.y + PRISON_HEIGHT;

        const isOutsidePrison = !(insideX && insideY && insideZ);

        if (isOutsidePrison) {
            buildPrison(player); // rebuild walls if needed
            freezePlayer(player); // freeze again
            player.sendMessage(`§2[§7Paradox§2]§o§7 You were returned to your prison after respawn.`);
        }
    }
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

    const bannedPlayers = banlistDB.get("players") ?? {};
    const whitelistedPlayers = whitelistDB.get("players") ?? {};

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
 * Checks an allowlist similar to the native one in BDS.
 * If the connecting player is not on the list, they get kicked.
 * @param {PlayerSpawnAfterEvent} event - The event object containing player spawn information.
 */
function allowList(event: PlayerSpawnAfterEvent): void {
    const player = event.player;
    const playerName = player.name;
    const allowListedPlayers = allowlistDB.get("players") ?? {};

    // If no allowlist is enforced, let everyone in
    if (Object.keys(allowListedPlayers).length === 0) return;

    // Get host info
    const opsecData: SecurityClearanceData = JSON.parse((world.getDynamicProperty("paradoxOPSEC") as string) ?? "{}");

    // Always allow the host
    if (opsecData.host?.id === player.id) {
        player.sendMessage("§2[§7Paradox§2]§o§7 You are the host and bypass the allowlist. Welcome back!");
        return;
    }

    // If the player is on the allowlist, welcome them
    if (playerName in allowListedPlayers) {
        player.sendMessage("§2[§7Paradox§2]§o§7 You are on the allow list, welcome.");
        return;
    }

    // Otherwise, kick the player
    player.runCommand(`kick @s You are not on the allow list.`);
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
function isPlatformBlocked(event: PlayerSpawnAfterEvent): void {
    const player = event.player;

    // Ensure spoof tracking property exists
    if (!player.getDynamicProperty("PlayerName")) {
        player.setDynamicProperty("PlayerName", player.name);
    }

    const platformModule = paradoxModulesDB.get("platformBlock_b");

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

    const bannedPlayers = banlistDB.get("players") ?? {};
    const whitelistedPlayers = whitelistDB.get("players") ?? {};
    const opsecData: SecurityClearanceData = JSON.parse((world.getDynamicProperty("paradoxOPSEC") as string) ?? "{}");

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
