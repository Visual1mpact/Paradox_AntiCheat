import { chatSendSubscription } from "penrose/classes/subscriptions/chat-send-subscriptions";
import { subscribeToWorldInitialize } from "penrose/event-listeners/world-initialize";
import { CommandHandler } from "penrose/classes/command-handler";
import { opCommand } from "penrose/commands/moderation/op";
import { MinecraftEnvironment } from "penrose/classes/container/dependencies";
import { deopCommand } from "penrose/commands/moderation/deop";
import { punishCommand } from "penrose/commands/moderation/punish";
import { vanishCommand } from "penrose/commands/moderation/vanish";
import { prefixCommand } from "penrose/commands/moderation/prefix";
import { despawnCommand } from "penrose/commands/moderation/despawn";
import { kickCommand } from "penrose/commands/moderation/kick";
import { lockdownCommand } from "penrose/commands/moderation/lockdown";
import { tpaCommand } from "penrose/commands/moderation/tpa";
import { homeCommand } from "penrose/commands/utility/home";
import { onPlayerSpawn } from "penrose/event-listeners/player-spawn";
import { invseeCommand } from "penrose/commands/utility/invsee";
import { opsecCommand } from "penrose/commands/moderation/opsec";
import { tprCommand } from "penrose/commands/utility/tpr";
import { setRankCommand } from "penrose/commands/utility/rank";
import { banCommand } from "penrose/commands/moderation/ban";
import { unbanCommand } from "penrose/commands/moderation/unban";
import { lagClearCommand } from "penrose/commands/settings/lag-clear";
import { gameModeCommand } from "penrose/commands/settings/game-mode";
import { worldBorderCommand } from "penrose/commands/settings/world-border";
import { flyCheckCommand } from "penrose/commands/settings/fly";
import { afkCommand } from "penrose/commands/settings/afk";
import { antispamCommand } from "penrose/commands/settings/spam";
import { pvpCooldownCommand, pvpToggleCommand, pvpToggleCooldownCommand } from "penrose/commands/utility/pvp";
import { channelCommand } from "penrose/commands/utility/channels";
import { hitReachCheckCommand } from "penrose/commands/settings/reach";
import { autoClickerCommand } from "penrose/commands/settings/autoclicker";
import { killauraCommand } from "penrose/commands/settings/killaura";
import { modulesStatusCommand } from "penrose/commands/moderation/modules";
import { scaffoldCommand } from "penrose/commands/settings/scaffold";
import { imprisonCommand } from "penrose/commands/moderation/freeze";
import { platformBlockCommand } from "penrose/commands/settings/platform-block";
import { nameSpoofCommand } from "penrose/commands/settings/namespoof";
import { xrayCommand } from "penrose/commands/settings/xray";
import { initializeSecurityClearanceTracking } from "penrose/utility/level-4-security-tracker";
import { healthChangeListener } from "penrose/event-listeners/health-sync";
import { whitelistCommand } from "penrose/commands/moderation/whitelist";
import { OptimizedDatabase } from "penrose/classes/database/data-hive";
import { tinyCommand } from "./commands/utility/tiny";
// @ts-ignore
import { guiCommand } from "penrose/commands/gui/main";

// Data Hive
const paradoxModulesDB = new OptimizedDatabase("paradoxModules");
const channelsDB = new OptimizedDatabase("channels");

// Subscribe to chat send events
chatSendSubscription.subscribe();

// Get the Minecraft environment instance
const minecraftEnvironment = MinecraftEnvironment.getInstance();

// Initializes the tracking of players with security clearance level 4.
initializeSecurityClearanceTracking(minecraftEnvironment.getWorld());

// Subscribe to world initialization events
subscribeToWorldInitialize();

// subscribe to player spawn events
onPlayerSpawn();

// Synchronize health
healthChangeListener.start();

// Initialize the CommandHandler with the security key and Minecraft environment
const commandHandler = new CommandHandler(minecraftEnvironment);

// Register commands with the CommandHandler
commandHandler.registerCommand([
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
    tinyCommand,
    //guiCommand,
]);

export { commandHandler, paradoxModulesDB, channelsDB };
