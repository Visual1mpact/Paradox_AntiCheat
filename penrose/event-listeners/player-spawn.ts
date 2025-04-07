import { PlayerSpawnAfterEvent, world } from "@minecraft/server";
import { paradoxModulesDB } from "../event-listeners/world-initialize";
import { buildPrison, freezePlayer, PRISON_LOCATION_PROPERTY } from "../commands/moderation/freeze";

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
        const dimension = player.dimension;
        dimension.runCommand(`kick ${playerName} §o§7\n\nYour device does not meet the minimum requirements to join this world. You have been banned.`);
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

    player.dimension.runCommand(`kick ${playerName} §o§7\n\nYou are not on the allow list.`);
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
        const dimension = player.dimension;
        dimension.runCommand(`kick ${player.name} §o§7\n\nThis platform is not authorized!`);
    }
}

/**
 * Checks if a player is banned during their spawn event.
 * @param {PlayerSpawnAfterEvent} event - The event object containing information about player spawn.
 */
function handleBanCheck(event: PlayerSpawnAfterEvent) {
    const player = event.player;
    const playerName = player.name;

    // Safely parse the bannedPlayers and whitelistedPlayers from dynamic properties
    const bannedPlayers: PlayerNameList = JSON.parse((world.getDynamicProperty("bannedPlayers") as string) ?? "[]");
    const whitelistedPlayers: PlayerNameList = JSON.parse((world.getDynamicProperty("whitelistedPlayers") as string) ?? "[]");

    if (bannedPlayers.includes(playerName)) {
        if (whitelistedPlayers.includes(playerName)) {
            const updatedBannedPlayers = bannedPlayers.filter((name) => name !== playerName);
            world.setDynamicProperty("bannedPlayers", JSON.stringify(updatedBannedPlayers));
            player.sendMessage("§2[§7Paradox§2]§o§7 You have been removed from the ban list due to being whitelisted.");
        } else {
            const dimension = player.dimension;
            dimension.runCommand(`kick ${playerName} §o§7\n\nYou are banned. Please contact an admin for more information.`);
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
