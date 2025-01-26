import { chatSendSubscription } from "./classes/subscriptions/chat-send-subscriptions";
import { subscribeToWorldInitialize } from "./event-listeners/world-initialize";
import { Command, CommandHandler } from "./classes/command-handler";
import { opCommand } from "./commands/moderation/op";
import { deopCommand } from "./commands/moderation/deop";
import { punishCommand } from "./commands/moderation/punish";
import { vanishCommand } from "./commands/moderation/vanish";
import { prefixCommand } from "./commands/moderation/prefix";
import { despawnCommand } from "./commands/moderation/despawn";
import { kickCommand } from "./commands/moderation/kick";
import { lockdownCommand } from "./commands/moderation/lockdown";
import { tpaCommand } from "./commands/moderation/tpa";
import { homeCommand } from "./commands/utility/home";
import { onPlayerSpawn } from "./event-listeners/player-spawn";
import { invseeCommand } from "./commands/utility/invsee";
import { opsecCommand } from "./commands/moderation/opsec";
import { tprCommand } from "./commands/utility/tpr";
import { setRankCommand } from "./commands/utility/rank";
import { banCommand } from "./commands/moderation/ban";
import { unbanCommand } from "./commands/moderation/unban";
import { lagClearCommand } from "./commands/settings/lag-clear";
import { gameModeCommand } from "./commands/settings/game-mode";
import { worldBorderCommand } from "./commands/settings/world-border";
import { flyCheckCommand } from "./commands/settings/fly";
import { afkCommand } from "./commands/settings/afk";
import { antispamCommand } from "./commands/settings/spam";
import { pvpCooldownCommand, pvpToggleCommand, pvpToggleCooldownCommand } from "./commands/utility/pvp";
import { channelCommand } from "./commands/utility/channels";
import { hitReachCheckCommand } from "./commands/settings/reach";
import { autoClickerCommand } from "./commands/settings/autoclicker";
import { killauraCommand } from "./commands/settings/killaura";
import { modulesStatusCommand } from "./commands/moderation/modules";
import { scaffoldCommand } from "./commands/settings/scaffold";
import { imprisonCommand } from "./commands/moderation/freeze";
import { platformBlockCommand } from "./commands/settings/platform-block";
import { nameSpoofCommand } from "./commands/settings/namespoof";
import { xrayCommand } from "./commands/settings/xray";
import { initializeSecurityClearanceTracking } from "./utility/level-4-security-tracker";
import { healthChangeListener } from "./event-listeners/health-sync";
import { whitelistCommand } from "./commands/moderation/whitelist";
import { OptimizedDatabase } from "./classes/database/data-hive";
import { guiCommand } from "./commands/gui/form_generator";
import { command } from "./commands/moderation/command";
import { selfAttackCheckCommand } from "./commands/settings/self-infliction";
import { rateLimitCommand } from "./commands/settings/rate-limit";
import { packetMonitorCommand } from "./commands/settings/packet-monitor";

// Data Hive
const paradoxModulesDB = new OptimizedDatabase("paradoxModules");
const channelsDB = new OptimizedDatabase("channels");
const disabledCommandsDB = new OptimizedDatabase("disabledCommands");

// Subscribe to chat send events
chatSendSubscription.subscribe();

// Initializes the tracking of players with security clearance level 4.
initializeSecurityClearanceTracking();

// Subscribe to world initialization events
subscribeToWorldInitialize();

// subscribe to player spawn events
onPlayerSpawn();

// Synchronize health
healthChangeListener.start();

// Initialize the CommandHandler with the security key and Minecraft environment
const commandHandler = new CommandHandler();

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
];

// Fetch disabled commands from the database and create a Set for faster lookups
const disabledCommandsSet = new Set(disabledCommandsDB.entries().map((entry) => entry[0]));

// Filter out disabled commands using the Set for faster lookup
const enabledCommands = allCommands.filter((command) => !disabledCommandsSet.has(command.name));

// Register only the enabled commands
commandHandler.registerCommand(enabledCommands);

export { commandHandler, paradoxModulesDB, channelsDB, disabledCommandsDB };
