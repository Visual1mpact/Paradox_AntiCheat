import { PlayerSpawnAfterEvent, system, world } from "@minecraft/server";
import { lockdownCommand } from "../commands/moderation/lockdown";
import { startLagClear } from "../modules/lag-clear";
import { startGameModeCheck } from "../modules/game-mode";
import { startWorldBorderCheck } from "../modules/world-border";
import { startFlyCheck } from "../modules/fly";
import { startAFKChecker } from "../modules/afk";
import { initializePvPSystem } from "../modules/pvp-manager";
import { startHitReachCheck } from "../modules/reach";
import { startDoubleJump, doubleJumpCommand } from "../commands/utility/double-jump";
import { startAutoClicker } from "../modules/autoclicker";
import { startKillAuraCheck } from "../modules/killaura";
import { startScaffoldCheck } from "../modules/scaffold";
import { startNamespoofDetection } from "../modules/namespoof";
import { startXrayDetection } from "../modules/xray";
import { startInvSync } from "../modules/invsync";
import { globalBanPlayers } from "../data/global-ban";
import { paradoxVersion } from "../data/versioning";
import { OptimizedDatabase } from "../classes/database/data-hive";
import { startSelfAttackCheck } from "../modules/self-infliction";
import { startPacketHandler } from "../modules/rate-limit";
import { startPacketListener } from "../modules/packet-monitor";
import { startVisionCheck } from "../modules/vision";
import { Command, CommandHandler } from "../classes/command-handler";
import { opCommand } from "../commands/moderation/op";
import { deopCommand } from "../commands/moderation/deop";
import { punishCommand } from "../commands/moderation/punish";
import { vanishCommand } from "../commands/moderation/vanish";
import { prefixCommand } from "../commands/moderation/prefix";
import { despawnCommand } from "../commands/moderation/despawn";
import { kickCommand } from "../commands/moderation/kick";
import { tpaCommand } from "../commands/moderation/tpa";
import { homeCommand } from "../commands/utility/home";
import { invseeCommand } from "../commands/utility/invsee";
import { opsecCommand } from "../commands/moderation/opsec";
import { tprCommand } from "../commands/utility/tpr";
import { setRankCommand } from "../commands/utility/rank";
import { banCommand } from "../commands/moderation/ban";
import { unbanCommand } from "../commands/moderation/unban";
import { lagClearCommand } from "../commands/settings/lag-clear";
import { gameModeCommand } from "../commands/settings/game-mode";
import { gameruleCommand } from "../commands/settings/gamerule";
import { worldBorderCommand } from "../commands/settings/world-border";
import { flyCheckCommand } from "../commands/settings/fly";
import { afkCommand } from "../commands/settings/afk";
import { antispamCommand } from "../commands/settings/spam";
import { pvpCooldownCommand, pvpToggleCommand, pvpToggleCooldownCommand } from "../commands/utility/pvp";
import { channelCommand } from "../commands/utility/channels";
import { hitReachCheckCommand } from "../commands/settings/reach";
import { autoClickerCommand } from "../commands/settings/autoclicker";
import { killauraCommand } from "../commands/settings/killaura";
import { modulesStatusCommand } from "../commands/moderation/modules";
import { scaffoldCommand } from "../commands/settings/scaffold";
import { imprisonCommand } from "../commands/moderation/freeze";
import { platformBlockCommand } from "../commands/settings/platform-block";
import { nameSpoofCommand } from "../commands/settings/namespoof";
import { xrayCommand } from "../commands/settings/xray";
import { whitelistCommand } from "../commands/moderation/whitelist";
import { guiCommand } from "../commands/gui/form-generator";
import { command } from "../commands/moderation/command";
import { selfAttackCheckCommand } from "../commands/settings/self-infliction";
import { rateLimitCommand } from "../commands/settings/rate-limit";
import { packetMonitorCommand } from "../commands/settings/packet-monitor";
import { allowlistCommand } from "../commands/moderation/allowlist";
import { visionCheckCommand } from "../commands/settings/vision";
import { invSyncCommand } from "../commands/settings/invsync";
import { healthChangeListener } from "./health-sync";
import { onPlayerSpawn } from "./player-spawn";
import { initializeGlobalBanCheck } from "./global-ban-listener";
import { initializeSecurityClearanceTracking } from "../utility/level-4-security-tracker";
import { chatSendSubscription } from "../classes/subscriptions/chat-send-subscriptions";
import { debugDBCommand } from "../commands/utility/debug-db";
import {
    AllowlistPlayersSchema,
    BanlistPlayersSchema,
    ChannelsSchema,
    DisabledCommandsSchema,
    ParadoxModulesSchema,
    WhitelistPlayersSchema,
    InvSyncAudit,
    InvSyncSnapshots,
    ChestLocksSchema,
    WarnsSchema,
    PlayerMetadataSchema,
    HomesSchema,
    WaypointsSchema,
} from "../classes/database/db-types";
import { noClipCommand } from "../commands/settings/noclip";
import { startNoClip } from "../modules/noclip";
import { PlayerCache } from "../classes/cache/player-cache";
import { invCloneCommand } from "../commands/utility/invclone";
import { chestForensicCommand } from "../commands/settings/container-lock";
import { startChestLock } from "../modules/container-lock";
import { scriptureCommand } from "../commands/utility/scriptures";
import { paradoxInfoCommand } from "../commands/utility/paradox-info";
import { transferCommand } from "../commands/utility/transfer";
import { muteCommand } from "../commands/moderation/mute";
import { warnCommand } from "../commands/moderation/warn";
import { renameCommand } from "../commands/moderation/rename";
import { tpsCommand } from "../commands/utility/tps";
import { deathCoordsCommand } from "../commands/settings/death-coords";
import { startDeathCoords } from "../modules/death-coords";
import { startAimbotMonitor } from "../modules/aimbot-monitor";
import { aimbotMonitorCommand } from "../commands/settings/aimbot-monitor";
import { criticalsCommand } from "../commands/settings/criticals";
import { startCriticalsCheck } from "../modules/criticals";
import { autoTotemCommand } from "../commands/settings/autototem";
import { startAutoTotemCheck } from "../modules/autototem";
import { pathingCommand } from "../commands/settings/pathing-monitor";
import { startPathingMonitor } from "../modules/pathing-monitor";
import { anticrashCommand } from "../commands/settings/anticrash";
import { startAntiCrash } from "../modules/anticrash";
import { EventCoordinator } from "../classes/event-coordinator";
import { dimensionLockCommand } from "../commands/settings/dimension-lock";
import { startDimensionLock } from "../modules/dimension-lock";
import { itemUseSubscription } from "../classes/subscriptions/item-use-subscriptions";
import { guiItemCommand } from "../commands/settings/gui-item";
import { broadcastCommand } from "../commands/utility/broadcast";
import { whoisCommand } from "../commands/utility/whois";
import { waypointCommand, startWaypointHUD } from "../commands/utility/waypoint";
import { historyCommand } from "../commands/utility/history";
import { environmentCommand } from "../commands/utility/environment";
import { pingCommand } from "../commands/utility/ping";
import { graveSaverCommand } from "../commands/settings/grave-saver";
import { startGraveSaver } from "penrose/modules/grave-saver";
import { inventoryEditorCommand } from "penrose/commands/utility/inventory-editor";
import { chunkBordersCommand } from "../commands/utility/chunkborders";
import { invalidMovementVectorCommand } from "../commands/settings/invalid-movement-vector";
import { inventoryMovementCommand } from "../commands/settings/inventory-movement";

type PlayerID = string;

interface Channel {
    Owner: PlayerID;
    Members: Record<PlayerID, string>;
    lastActive: number; // store `Date.now()` timestamp
}

// Store the lockDownMonitor function reference
let lockDownMonitor: ((event: PlayerSpawnAfterEvent) => void) | undefined;
let wrappedLockDownMonitor: ((event: PlayerSpawnAfterEvent) => void) | undefined;

// Declare the necessary objects to be exported
let paradoxModulesDB: OptimizedDatabase<ParadoxModulesSchema>;
let channelsDB: OptimizedDatabase<ChannelsSchema>;
let disabledCommandsDB: OptimizedDatabase<DisabledCommandsSchema>;
let whitelistDB: OptimizedDatabase<WhitelistPlayersSchema>;
let allowlistDB: OptimizedDatabase<AllowlistPlayersSchema>;
let banlistDB: OptimizedDatabase<BanlistPlayersSchema>;
let warnsDB: OptimizedDatabase<WarnsSchema>;
let invSyncSnapshotsDB: OptimizedDatabase<InvSyncSnapshots>;
let invSyncAuditDB: OptimizedDatabase<InvSyncAudit>;
let chestLockDB: OptimizedDatabase<ChestLocksSchema>;
let playerMetadataDB: OptimizedDatabase<PlayerMetadataSchema>;
let homesDB: OptimizedDatabase<HomesSchema>;
let waypointsDB: OptimizedDatabase<WaypointsSchema>;
let commandHandler: CommandHandler;

// Define all available commands
const allCommands: Command[] = [
    opCommand,
    deopCommand,
    punishCommand,
    vanishCommand,
    prefixCommand,
    despawnCommand,
    kickCommand,
    lockdownCommand,
    tpaCommand,
    homeCommand,
    invseeCommand,
    opsecCommand,
    tprCommand,
    setRankCommand,
    banCommand,
    unbanCommand,
    lagClearCommand,
    gameModeCommand,
    gameruleCommand,
    worldBorderCommand,
    flyCheckCommand,
    afkCommand,
    antispamCommand,
    pvpToggleCommand,
    channelCommand,
    hitReachCheckCommand,
    autoClickerCommand,
    killauraCommand,
    modulesStatusCommand,
    scaffoldCommand,
    imprisonCommand,
    platformBlockCommand,
    nameSpoofCommand,
    pvpCooldownCommand,
    pvpToggleCooldownCommand,
    xrayCommand,
    whitelistCommand,
    guiCommand,
    command,
    selfAttackCheckCommand,
    rateLimitCommand,
    packetMonitorCommand,
    allowlistCommand,
    visionCheckCommand,
    doubleJumpCommand,
    debugDBCommand,
    invSyncCommand,
    noClipCommand,
    invCloneCommand,
    chestForensicCommand,
    scriptureCommand,
    paradoxInfoCommand,
    transferCommand,
    muteCommand,
    warnCommand,
    renameCommand,
    tpsCommand,
    deathCoordsCommand,
    aimbotMonitorCommand,
    criticalsCommand,
    autoTotemCommand,
    pathingCommand,
    anticrashCommand,
    dimensionLockCommand,
    guiItemCommand,
    broadcastCommand,
    whoisCommand,
    waypointCommand,
    historyCommand,
    environmentCommand,
    pingCommand,
    graveSaverCommand,
    inventoryEditorCommand,
    chunkBordersCommand,
    invalidMovementVectorCommand,
    inventoryMovementCommand,
];

/**
 * Initializes and instantiates all necessary systems (databases, command handler, etc.)
 */
async function initializeSystems() {
    // 1. Instantiate Databases
    paradoxModulesDB = new OptimizedDatabase("paradoxModules");
    channelsDB = new OptimizedDatabase("channels");
    disabledCommandsDB = new OptimizedDatabase("disabledCommands");
    whitelistDB = new OptimizedDatabase("whitelist");
    allowlistDB = new OptimizedDatabase("allowlist");
    banlistDB = new OptimizedDatabase("banlist");
    warnsDB = new OptimizedDatabase("warns");
    invSyncSnapshotsDB = new OptimizedDatabase("invSyncSnapshots");
    invSyncAuditDB = new OptimizedDatabase("invSyncAudit");
    chestLockDB = new OptimizedDatabase("chestLocks");
    playerMetadataDB = new OptimizedDatabase("playerMetadata");
    homesDB = new OptimizedDatabase("homes");
    waypointsDB = new OptimizedDatabase("waypoints");

    const dbs = [paradoxModulesDB, channelsDB, disabledCommandsDB, whitelistDB, allowlistDB, banlistDB, warnsDB, invSyncAuditDB, invSyncSnapshotsDB, chestLockDB, playerMetadataDB, homesDB, waypointsDB];

    // 2. Run Database Migrations (v1 Uncompressed -> v2 LZW Compressed)
    console.log("[Paradox] Running database v2.0 compression migrations...");
    const migrationResults = await Promise.allSettled(dbs.map((db) => db.migrateToV2()));

    let totalMigrated = 0;
    let totalSavedBytes = 0;

    migrationResults.forEach((result, i) => {
        if (result.status === "fulfilled") {
            const { migrated, originalBytes, compressedBytes } = result.value;
            totalMigrated += migrated;
            totalSavedBytes += originalBytes - compressedBytes;
        } else {
            console.warn(`[Paradox] Migration failed for DB '${dbs[i].name}':`, result.reason);
        }
    });

    if (totalMigrated > 0) {
        console.log(`[Paradox] Migration complete! Standardized ${totalMigrated} entries. Total space saved: ${paradoxModulesDB.formatBytes(totalSavedBytes)}.`);
    } else {
        console.log("[Paradox] All databases are up to date (v2.0 compressed).");
    }

    // 3. Clean up invalid entries
    const cleanResults = await Promise.allSettled(dbs.map((db) => db.clean()));
    cleanResults.forEach((result, i) => {
        if (result.status === "rejected") {
            console.warn(`[Paradox] Failed to clean DB at index ${i}:`, result.reason);
        }
    });

    // 4. Clean up stagnant channels
    async function channelsDBCleanup() {
        const now = Date.now();
        const cutoff = now - 7 * 24 * 60 * 60 * 1000; // 7 days in ms

        for (const [channelName, channel] of (await channelsDB.entries()) as [string, Channel][]) {
            if (typeof channel.lastActive !== "number") continue;
            if (channel.lastActive < cutoff) {
                await channelsDB.delete(channelName);
                console.warn(`[Paradox] Removed inactive channel '${channelName}' (last active ${new Date(channel.lastActive).toLocaleString()})`);
            }
        }
    }

    await channelsDBCleanup();

    // 5. Instantiate CommandHandler
    commandHandler = new CommandHandler();

    // Fetch disabled commands from the database and create a Set for faster lookups
    const disabledCommandsSet = new Set((await disabledCommandsDB.entries()).map((entry) => entry[0]));

    // Filter out disabled commands using the Set for faster lookup
    const enabledCommands = allCommands.filter((command) => !disabledCommandsSet.has(command.name));

    // Register only the enabled commands
    commandHandler.registerCommand(enabledCommands);
}

/**
 * Compares two version strings in the format "vX.Y.Z" and returns -1 if the first version is smaller,
 * 1 if the first version is greater, and 0 if both are equal.
 */
function compareVersions(version1: string, version2: string): number {
    const parseVersion = (version: string) => {
        return version
            .slice(1)
            .split(".")
            .map((num) => parseInt(num, 10)); // Remove 'v' and split by '.'
    };

    const v1Parts = parseVersion(version1);
    const v2Parts = parseVersion(version2);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = v1Parts[i] ?? 0; // Default to 0 if the version part doesn't exist
        const v2Part = v2Parts[i] ?? 0; // Default to 0 if the version part doesn't exist

        if (v1Part < v2Part) return -1;
        if (v1Part > v2Part) return 1;
    }

    return 0; // The versions are equal
}

/**
 * Validates the stored command prefix and resets it to default if it violates safety rules.
 */
function initializePrefix() {
    const DEFAULT_PREFIX = ":";
    const currentPrefix = world.getDynamicProperty("__prefix") as string | undefined;

    if (currentPrefix === undefined) {
        world.setDynamicProperty("__prefix", DEFAULT_PREFIX);
        return;
    }

    const isIllegal = currentPrefix.length === 0 || currentPrefix.length > 2 || currentPrefix.includes("/") || currentPrefix.includes("§") || /\s/.test(currentPrefix) || /[a-zA-Z0-9]/.test(currentPrefix);

    if (isIllegal) {
        console.warn(`[Paradox] Invalid prefix "${currentPrefix}" detected during initialization. Resetting to "${DEFAULT_PREFIX}".`);
        world.setDynamicProperty("__prefix", DEFAULT_PREFIX);
    }
}

/**
 * Initializes the global banned players list if it does not exist.
 * If it doesn't exist, create it and store the `globalBanPlayers` list as a stringified JSON object.
 */
function initializeGlobalBanList() {
    const globalBannedPlayersKey = "globalBannedPlayers";

    // Get the current world version dynamically
    const version = world.getDynamicProperty("paradoxVersion") as string;

    // Compare the world version with the paradox version
    if (!version || compareVersions(version, paradoxVersion) < 0) {
        // Update the current world version
        world.setDynamicProperty("paradoxVersion", paradoxVersion);
        // Update global ban list for new version
        world.setDynamicProperty(globalBannedPlayersKey, JSON.stringify([...globalBanPlayers]));
        return;
    }

    // Check if the globalBannedPlayers dynamic property already exists
    const existingBanList = world.getDynamicProperty(globalBannedPlayersKey);

    if (!existingBanList) {
        // If it doesn't exist, initialize it with the globalBanPlayers array
        world.setDynamicProperty(globalBannedPlayersKey, JSON.stringify([...globalBanPlayers]));
    }
}

/**
 * Initializes and updates paradoxModules from the world dynamic property.
 * Starts corresponding modules based on their configured values.
 * @returns {Promise<void>}
 */
async function initializeParadoxModules(): Promise<void> {
    // Retrieve paradoxModules from the OptimizedDatabase (paradoxModulesDB)
    const paradoxModules = await paradoxModulesDB.entries();

    // Lookup table for module initialization
    const moduleActions: Record<string, () => void> = {
        lagClearCheck_b: async () => {
            const moduleData = await paradoxModulesDB.get("lagClearCheck_b");
            const settings = moduleData?.settings;
            if (settings && "hours" in settings && "minutes" in settings && "seconds" in settings) {
                startLagClear(settings.hours, settings.minutes, settings.seconds);
            } else {
                startLagClear(0, 5, 0); // fallback
            }
        },
        gamemodeCheck_b: () => startGameModeCheck(),
        worldBorderCheck_b: () => startWorldBorderCheck(),
        flyCheck_b: () => startFlyCheck(),
        afkCheck_b: async () => {
            const moduleData = await paradoxModulesDB.get("afkCheck_b");
            const settings = moduleData?.settings;
            if (settings && "hours" in settings && "minutes" in settings && "seconds" in settings) {
                startAFKChecker(settings.hours, settings.minutes, settings.seconds);
            } else {
                startAFKChecker(0, 10, 0);
            }
        },
        hitReachCheck_b: () => startHitReachCheck(),
        autoClickerCheck_b: () => startAutoClicker(),
        killAuraCheck_b: () => startKillAuraCheck(),
        scaffoldCheck_b: () => startScaffoldCheck(),
        nameSpoofCheck_b: () => startNamespoofDetection(),
        xrayDetection_b: () => startXrayDetection(),
        selfAttackCheck_b: () => startSelfAttackCheck(),
        rateLimitCheck_b: () => startPacketHandler(),
        packetMonitorCheck_b: () => startPacketListener(),
        visionCheck_b: () => startVisionCheck(),
        invSync_b: () => startInvSync(),
        noClipCheck_b: () => startNoClip(),
        chestLock_b: () => startChestLock(),
        deathCoords_b: () => startDeathCoords(),
        aimbotMonitorCheck_b: () => startAimbotMonitor(),
        criticalsCheck_b: () => startCriticalsCheck(),
        autoTotemCheck_b: () => startAutoTotemCheck(),
        pathingCheck_b: () => startPathingMonitor(),
        antiCrashCheck_b: () => startAntiCrash(),
        dimensionLock_b: () => startDimensionLock(),
        graveSaver_b: () => startGraveSaver(),
    };

    const runModuleInitializers = () => {
        paradoxModules.forEach(([key, value]) => {
            if ("enabled" in value && value.enabled && moduleActions[key]) {
                moduleActions[key]();
            }
        });
    };

    system.run(runModuleInitializers);
}

/**
 * Subscribes to the lockdown event and sets up a monitor for player spawns.
 * If lockdown is active, the player spawn event will be handled by the lockdown monitor.
 */
function subscribeToLockDown() {
    lockDownMonitor = lockdownCommand.execute(undefined, undefined, undefined, true) as (event: PlayerSpawnAfterEvent) => void;
    if (lockDownMonitor) {
        wrappedLockDownMonitor = (event: PlayerSpawnAfterEvent) => {
            const isLockdownActive = world.getDynamicProperty("lockdown_b");
            if (!isLockdownActive) {
                unsubscribeFromLockDown();
                return;
            }
            if (lockDownMonitor) {
                lockDownMonitor(event); // Call the original lockDownMonitor
            }
        };
        EventCoordinator.subscribeAfter("playerSpawn", wrappedLockDownMonitor);
    }
}

/**
 * Unsubscribes from the lockdown event and cleans up references to monitoring functions.
 * Stops handling player spawn events for lockdown if no longer active.
 */
function unsubscribeFromLockDown() {
    const cleanupLockdownState = () => {
        if (wrappedLockDownMonitor) {
            EventCoordinator.unsubscribeAfter("playerSpawn", wrappedLockDownMonitor);
            wrappedLockDownMonitor = undefined; // Clear the reference
        }
        lockDownMonitor = undefined; // Clear the reference to the original function
        EventCoordinator.unsubscribeAfter("worldLoad", onWorldInitialize); // Unsubscribe from world load to prevent re-initialization
    };

    system.run(cleanupLockdownState);
}

/**
 * Checks if lockdown is active and subscribes to the lockdown events if so.
 */
function handleLockDown() {
    const isLockdownActive = world.getDynamicProperty("lockdown_b");
    if (isLockdownActive) {
        subscribeToLockDown();
    }
}

/**
 * Checks if PvP is globally enabled and initializes the PvP system if so.
 * Sets the PvP game rule to true if the dynamic property is enabled.
 */
function handlePvP() {
    const isPvPGlobalEnabled = world.getDynamicProperty("pvpGlobalEnabled") ?? false;

    if (isPvPGlobalEnabled) {
        // Ensure the game rule is set to true if PvP is enabled globally
        world.gameRules.pvp = true;

        // Initialize the PvP system
        initializePvPSystem();
    }
}

/**
 * Checks if Double Jump is enabled and initializes the system if so.
 */
function handleDoubleJump() {
    const isDoubleJumpEnabled = world.getDynamicProperty("doubleJumpEnabled") ?? false;
    if (isDoubleJumpEnabled) {
        startDoubleJump();
    }
}

/**
 * Initializes paradoxModules and handles lockdown on world load.
 * @returns {Promise<void>}
 */
async function onWorldInitialize(): Promise<void> {
    if (commandHandler.getGuiItem()) itemUseSubscription.subscribe(); // Only subscribe if a GUI item is configured
    chatSendSubscription.subscribe(); // Subscribe to chat send events
    initializeSecurityClearanceTracking(); // Initializes the tracking of players with security clearance level 4.
    initializeGlobalBanList(); // Ensure the global banned player list is initialized
    initializeGlobalBanCheck(); // Initialize the global ban listener
    initializePrefix(); // Validate and initialize the command prefix
    await initializeParadoxModules(); // Ensure paradoxModules is initialized and modules are started
    handleLockDown(); // Handle lockdown if it's active
    handlePvP(); // Handle PvP if it's enabled
    handleDoubleJump(); // Handle Double Jump persistence
    onPlayerSpawn(); // Subscribe to player spawn events
    startWaypointHUD(); // Initialize the Waypoint navigation HUD
    healthChangeListener.start(); // Synchronize health
}

/**
 * Subscribes to the world load event.
 * Sets up paradoxModules and handles lockdown when the world initializes.
 */
export function subscribeToWorldInitialize() {
    EventCoordinator.subscribeAfter("worldLoad", async () => {
        await initializeSystems();
        PlayerCache.init(); // Initialize PlayerCache after systems are set up
        await onWorldInitialize();
    });
}

// Export the instantiated databases and command handler
export { allCommands, paradoxModulesDB, channelsDB, disabledCommandsDB, commandHandler, whitelistDB, allowlistDB, banlistDB, warnsDB, invSyncAuditDB, invSyncSnapshotsDB, chestLockDB, playerMetadataDB, homesDB, waypointsDB };
