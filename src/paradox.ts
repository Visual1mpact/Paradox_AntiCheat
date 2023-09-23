// Import ChatSendBefore Events
import { BadPackets1 } from "./penrose/ChatSendBeforeEvent/spammer/badpackets_1.js";
import { SpammerA } from "./penrose/ChatSendBeforeEvent/spammer/spammer_a.js";
import { SpammerB } from "./penrose/ChatSendBeforeEvent/spammer/spammer_b.js";
import { SpammerC } from "./penrose/ChatSendBeforeEvent/spammer/spammer_c.js";
import { BeforePrefixCommand } from "./penrose/ChatSendBeforeEvent/chat/beforeprefixcommand.js";
import { beforeChatFilter } from "./penrose/ChatSendBeforeEvent/chat/chatfilter.js";
import { beforeAntiSpam } from "./penrose/ChatSendBeforeEvent/chat/antispam.js";
// Import Tick Events
import { ServerBan } from "./penrose/TickEvent/ban/serverban.js";
import { NamespoofA } from "./penrose/TickEvent/namespoof/namespoof_a.js";
import { NamespoofB } from "./penrose/TickEvent/namespoof/namespoof_b.js";
import { BedrockValidate } from "./penrose/TickEvent/bedrock/bedrockvalidate.js";
import { JesusA } from "./penrose/TickEvent/jesus/jesus_a.js";
import { SpeedA } from "./penrose/TickEvent/speed/speed_a.js";
import { IllegalItemsA } from "./penrose/TickEvent/illegalitems/illegalitems_a.js";
import { InvalidSprintA } from "./penrose/TickEvent/invalidsprint/invalidsprint_a.js";
import { FlyA } from "./penrose/TickEvent/fly/fly_a.js";
import { AntiKnockbackA } from "./penrose/TickEvent/knockback/antikb_a.js";
import { NoPerms } from "./penrose/TickEvent/noperms/nopermission.js";
import { WorldBorder } from "./penrose/TickEvent/worldborder/worldborder.js";
import { Vanish } from "./penrose/TickEvent/vanish/vanish.js";
import { Survival } from "./penrose/TickEvent/gamemode/survival.js";
import { Adventure } from "./penrose/TickEvent/gamemode/adventure.js";
import { Creative } from "./penrose/TickEvent/gamemode/creative.js";
import { IllegalItemsC } from "./penrose/TickEvent/illegalitems/illegalitems_c.js";
import { OPS } from "./penrose/TickEvent/oneplayersleep/oneplayersleep.js";
import { Hotbar } from "./penrose/TickEvent/hotbar/hotbar.js";
import { VerifyPermission } from "./penrose/TickEvent/noperms/verifypermission.js";
import { BadPackets2 } from "./penrose/TickEvent/badpackets2/badpackets2.js";
import { ClearLag } from "./penrose/TickEvent/clearlag/clearlag.js";
import { AntiFallA } from "./penrose/TickEvent/antifalla/antifall_a.js";
import { AutoBan } from "./penrose/TickEvent/ban/autoban.js";
import { freeze, freezeJoin, freezeLeave } from "./penrose/TickEvent/freeze/freeze.js";
import { AFK } from "./penrose/TickEvent/afk/afk.js";
import { AntiPhaseA } from "./penrose/TickEvent/phase/phase_a.js";
// Import PlayerBlockBreakAfter Events
import { XrayA } from "./penrose/PlayerBreakBlockAfterEvent/xray/xray_a.js";
// Import PlayerBlockBreakBefore Events
import { BeforeNukerA } from "./penrose/PlayerBreakBlockBeforeEvent/nuker/nuker_a.js";
// Import PlayerSpawnAfter Events
import { onJoin } from "./penrose/PlayerSpawnAfterEvent/onjoin/onjoin.js";
import { GlobalBanList } from "./penrose/PlayerSpawnAfterEvent/ban/globalbanlist.js";
import { hashCode } from "./penrose/PlayerSpawnAfterEvent/hash/hash.js";
import { onJoinrules } from "./gui/PlayerSpawnAfterEvent/rules/rules.js";
// Import PlayerBlockPlaceAfter Events
import { ScaffoldA } from "./penrose/PlayerPlaceBlockAfterEvent/scaffold/scaffold_a.js";
import { IllegalItemsB } from "./penrose/PlayerPlaceBlockAfterEvent/illegalitems/illegalitems_b.js";
import { ReachA } from "./penrose/PlayerPlaceBlockAfterEvent/reach/reach_a.js";
// Import EntityHitEntityAfter Events
import { ReachB } from "./penrose/EntityHitEntityAfterEvent/reach_b.js";
import { KillAura } from "./penrose/EntityHitEntityAfterEvent/killaura.js";
import { PVP } from "./penrose/EntityHitEntityAfterEvent/pvpManager.js";
// Import WorldInitializeAfter Events
import { Registry } from "./penrose/WorldInitializeAfterEvent/registry.js";
// Import SystemBefore Events
import { WatchDog } from "./penrose/SystemEvent/watchdog.js";
// Import ChatSendAfter Events
import { AfterPrefixCommand } from "./penrose/ChatSendAfterEvent/chat/afterprefixcommand.js";
import { TpRequestListener } from "./commands/utility/tpr.js";
import { afterAntiSpam } from "./penrose/ChatSendAfterEvent/chat/antispam.js";
import { afterChatFilter } from "./penrose/ChatSendAfterEvent/chat/chatfilter.js";
// Import EntityDieAfter Events
import { DeathCoordinates } from "./penrose/EntityDieAfterEvent/death_coordinates.js";
// Import PlayerLeaveAfter Events
import { onChannelLeave } from "./commands/utility/channel.js";
// Custom
import config from "./data/config.js";

// WorldInitializeAfter Events
Registry();

// ChatSendBefore Events
BadPackets1();
SpammerA();
SpammerB();
SpammerC();
beforeAntiSpam();
BeforePrefixCommand();
beforeChatFilter();

// ChatSendAfter Events
AfterPrefixCommand();
TpRequestListener();
afterAntiSpam();
afterChatFilter();

// Tick Events
ClearLag();
BadPackets2();
VerifyPermission;
OPS();
Hotbar();
NoPerms;
Vanish;
IllegalItemsC();
Survival();
Adventure();
Creative();
WorldBorder();
ServerBan;
NamespoofA();
NamespoofB();
BedrockValidate();
JesusA();
SpeedA();
IllegalItemsA();
InvalidSprintA();
FlyA();
AntiKnockbackA();
AntiFallA();
AutoBan();
AFK();
AntiPhaseA();
if (config.customcommands.freeze || config.modules.antiKillAura || config.modules.antinukerA) {
    freeze;
    freezeLeave();
    freezeJoin();
}

// PlayerBlockBreakAfter Events
XrayA();

// PlayerBlockBreakBefore Events
BeforeNukerA();

// playerSpawnAfter Events
onJoin();
GlobalBanList();
hashCode();
onJoinrules(); // GUI

// PlayerBlockPlaceAfter Events
ScaffoldA();
IllegalItemsB();
ReachA();

// EntityHitEntityAfter Events
ReachB();
KillAura();
PVP();
// EntityDieAfter Events
DeathCoordinates();

// SystemBefore Events
WatchDog();

// playerLeaveAfter Events
if (config.customcommands.channel === true) {
    onChannelLeave();
}
