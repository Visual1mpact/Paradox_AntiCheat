import { PlayerSpawnAfterEvent, system, world } from "@minecraft/server";
import { lockdownCommand } from "../commands/moderation/lockdown";
import { startLagClear } from "../modules/lag-clear";
import { startGameModeCheck } from "../modules/game-mode";
import { startWorldBorderCheck } from "../modules/world-border";
import { startFlyCheck } from "../modules/fly";
import { startAFKChecker } from "../modules/afk";
import { initializePvPSystem } from "../modules/pvp-manager";
import { startHitReachCheck } from "../modules/reach";
import { startAutoClicker } from "../modules/autoclicker";
import { startKillAuraCheck } from "../modules/killaura";
import { startScaffoldCheck } from "../modules/scaffold";
import { startNamespoofDetection } from "../modules/namespoof";
import { startXrayDetection } from "../modules/xray";
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
import { spoofLogCommand } from "../commands/moderation/spooflog";
import { healthChangeListener } from "./health-sync";
import { onPlayerSpawn } from "./player-spawn";
import { initializeSecurityClearanceTracking } from "../utility/level-4-security-tracker";
import { chatSendSubscription } from "../classes/subscriptions/chat-send-subscriptions";

// Store the lockDownMonitor function reference
let lockDownMonitor: ((event: PlayerSpawnAfterEvent) => void) | undefined;
let wrappedLockDownMonitor: ((event: PlayerSpawnAfterEvent) => void) | undefined;

// Declare the necessary objects to be exported
let paradoxModulesDB: OptimizedDatabase;
let channelsDB: OptimizedDatabase;
let disabledCommandsDB: OptimizedDatabase;
let spoofDB: OptimizedDatabase;
let commandHandler: CommandHandler;

/**
 * Initializes and instantiates all necessary systems (databases, command handler, etc.)
 */
function initializeSystems() {
    // Instantiate Databases
    paradoxModulesDB = new OptimizedDatabase("paradoxModules");
    channelsDB = new OptimizedDatabase("channels");
    disabledCommandsDB = new OptimizedDatabase("disabledCommands");
    spoofDB = new OptimizedDatabase("trustedPlayers");

    // Clean up invalid entries (Optional: you can pass a custom validation function per DB if needed)
    paradoxModulesDB.clean();
    channelsDB.clean();
    disabledCommandsDB.clean();
    spoofDB.clean();

    // Instantiate CommandHandler
    commandHandler = new CommandHandler();

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
        spoofLogCommand,
    ];

    // Fetch disabled commands from the database and create a Set for faster lookups
    const disabledCommandsSet = new Set(disabledCommandsDB.entries().map((entry) => entry[0]));

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
 * Initializes the global banned players list if it does not exist.
 * If it doesn't exist, create it and store the `globalBanPlayers` list as a stringified JSON object.
 */
function initializeGlobalBanList() {
    const globalBannedPlayersKey = "globalBannedPlayers";

    // Get the current world version dynamically
    const version = world.getDynamicProperty("paradoxVersion") as string;

    // Compare the world version with the paradox version
    if (!version || compareVersions(version, paradoxVersion) <= 0) {
        // Update the current world version
        world.setDynamicProperty("paradoxVersion", paradoxVersion);
        // Update global ban list for new version
        world.setDynamicProperty(globalBannedPlayersKey, JSON.stringify(globalBanPlayers));
        return;
    }

    // Check if the globalBannedPlayers dynamic property already exists
    const existingBanList = world.getDynamicProperty(globalBannedPlayersKey);

    if (!existingBanList) {
        // If it doesn't exist, initialize it with the globalBanPlayers array
        world.setDynamicProperty(globalBannedPlayersKey, JSON.stringify(globalBanPlayers));
    }
}

/**
 * Migrates outdated keys in paradoxModules to their updated versions based on a given mapping.
 */
function migrateParadoxModulesKeys(migrations: { [oldKey: string]: string }, paradoxModulesDB: OptimizedDatabase) {
    // Retrieve the paradoxModules object from the database
    let paradoxModules = paradoxModulesDB.get<{ [key: string]: any }>("paradoxModules");

    // If paradoxModules doesn't exist in the DB, no migration is necessary
    if (!paradoxModules) {
        return;
    }

    let updated = false;

    // Iterate through the migrations to rename old keys
    for (const [oldKey, newKey] of Object.entries(migrations)) {
        // If the old key exists, rename it
        if (paradoxModules[oldKey] !== undefined) {
            paradoxModules[newKey] = paradoxModules[oldKey];
            delete paradoxModules[oldKey]; // Remove the old key
            updated = true;
        }
    }

    // If there were any changes, save the updated paradoxModules back to the database
    if (updated) {
        paradoxModulesDB.set("paradoxModules", paradoxModules);
    }
}

/**
 * Initializes and updates paradoxModules from the world dynamic property.
 * Starts corresponding modules based on their configured values.
 */
function initializeParadoxModules() {
    /**
     * A mapping of outdated keys to their updated versions for `paradoxModules`.
     * This is used to ensure backward compatibility when key names are updated.
     *
     * @example
     * const keyMigrations = {
     *     platformBlockSettings: "platformBlock_settings", // Renames platformBlockSettings to platformBlock_settings
     *     oldSetting1: "newSetting1", // Renames oldSetting1 to newSetting1
     *     oldSetting2: "newSetting2", // Renames oldSetting2 to newSetting2
     * };
     */
    const keyMigrations = {
        platformBlockSettings: "platformBlock_settings",
    };

    // Migrate outdated keys first
    migrateParadoxModulesKeys(keyMigrations, paradoxModulesDB);

    // Retrieve paradoxModules from the OptimizedDatabase (paradoxModulesDB)
    const paradoxModules = paradoxModulesDB.entries(); // Getting all entries

    // Lookup table for module initialization
    const moduleActions: { [key: string]: () => void } = {
        lagClearCheck_b: () => {
            const settings = (paradoxModulesDB.get("lagClear_settings") as { hours: number; minutes: number; seconds: number }) ?? { hours: 0, minutes: 5, seconds: 0 };
            startLagClear(settings.hours, settings.minutes, settings.seconds);
        },
        gamemodeCheck_b: () => startGameModeCheck(),
        worldBorderCheck_b: () => startWorldBorderCheck(),
        flyCheck_b: () => startFlyCheck(),
        afkCheck_b: () => {
            const settings = (paradoxModulesDB.get("afk_settings") as { hours: number; minutes: number; seconds: number }) ?? { hours: 0, minutes: 10, seconds: 0 };
            startAFKChecker(settings.hours, settings.minutes, settings.seconds);
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
    };

    // Iterate over the entries and start corresponding modules if their value is true
    system.run(() => {
        paradoxModules.forEach(([key, value]) => {
            if (value === true && moduleActions[key]) {
                moduleActions[key](); // Call the appropriate function for the module
            }
        });
    });
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
            lockDownMonitor(event); // Call the original lockDownMonitor
        };
        world.afterEvents.playerSpawn.subscribe(wrappedLockDownMonitor);
    }
}

/**
 * Unsubscribes from the lockdown event and cleans up references to monitoring functions.
 * Stops handling player spawn events for lockdown if no longer active.
 */
function unsubscribeFromLockDown() {
    system.run(() => {
        if (wrappedLockDownMonitor) {
            world.afterEvents.playerSpawn.unsubscribe(wrappedLockDownMonitor);
            wrappedLockDownMonitor = undefined; // Clear the reference
        }
        lockDownMonitor = undefined; // Clear the reference to the original function
        world.afterEvents.worldLoad.unsubscribe(onWorldInitialize);
    });
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
 * Initializes paradoxModules and handles lockdown on world load.
 */
function onWorldInitialize() {
    chatSendSubscription.subscribe(); // Subscribe to chat send events
    initializeSecurityClearanceTracking(); // Initializes the tracking of players with security clearance level 4.
    initializeGlobalBanList(); // Ensure the global banned player list is initialized
    initializeParadoxModules(); // Ensure paradoxModules is initialized and modules are started
    handleLockDown(); // Handle lockdown if it's active
    handlePvP(); // Handle PvP if it's enabled
    onPlayerSpawn(); // Subscribe to player spawn events
    healthChangeListener.start(); // Synchronize health
}

/**
 * Subscribes to the world load event.
 * Sets up paradoxModules and handles lockdown when the world initializes.
 */
export function subscribeToWorldInitialize() {
    world.afterEvents.worldLoad.subscribe(() => {
        initializeSystems();
        onWorldInitialize();
    });
}

// Export the instantiated databases and command handler
export { paradoxModulesDB, channelsDB, disabledCommandsDB, spoofDB, commandHandler };
