// Import ChatSendBefore Events
import { BadPackets1 } from "./penrose/ChatSendBeforeEvent/spammer/badpackets_1.js";
import { SpammerA } from "./penrose/ChatSendBeforeEvent/spammer/spammer_a.js";
import { SpammerB } from "./penrose/ChatSendBeforeEvent/spammer/spammer_b.js";
import { SpammerC } from "./penrose/ChatSendBeforeEvent/spammer/spammer_c.js";
import { BeforePrefixCommand } from "./penrose/ChatSendBeforeEvent/chat/beforeprefixcommand.js";
import { ChatFilter } from "./penrose/ChatSendBeforeEvent/chat/chatfilter.js";
import { beforeAntiSpam } from "./penrose/ChatSendBeforeEvent/chat/antispam.js";
// Import Tick Events
import { ServerBan } from "./penrose/TickEvent/ban/serverban.js";
import { CrasherA } from "./penrose/TickEvent/crasher/crasher_a.js";
import { NamespoofA } from "./penrose/TickEvent/namespoof/namespoof_a.js";
import { NamespoofB } from "./penrose/TickEvent/namespoof/namespoof_b.js";
import { BedrockValidate } from "./penrose/TickEvent/bedrock/bedrockvalidate.js";
import { JesusA } from "./penrose/TickEvent/jesus/jesus_a.js";
import { NoSlowA } from "./penrose/TickEvent/noslow/noslow_a.js";
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
// Import BlockBreakAfter Events
import { XrayA } from "./penrose/BlockBreakAfterEvent/xray/xray_a.js";
import { NukerA } from "./penrose/BlockBreakAfterEvent/nuker/nuker_a.js";
// Import PlayerSpawnAfter Events
import { onJoin } from "./penrose/PlayerSpawnAfterEvent/onjoin/onjoin.js";
import { GlobalBanList } from "./penrose/PlayerSpawnAfterEvent/ban/globalbanlist.js";
import { hashCode } from "./penrose/PlayerSpawnAfterEvent/hash/hash.js";
import { onJoinrules } from "./gui/PlayerSpawnAfterEvent/rules/rules.js";
// Import BlockPlaceAfter Events
import { ScaffoldA } from "./penrose/BlockPlaceAfterEvent/scaffold/scaffold_a.js";
import { IllegalItemsB } from "./penrose/BlockPlaceAfterEvent/illegalitems/illegalitems_b.js";
import { ReachA } from "./penrose/BlockPlaceAfterEvent/reach/reach_a.js";
// Import EntityHitAfter Events
import { ReachB } from "./penrose/EntityHitAfterEvent/reach_b.js";
import { KillAura } from "./penrose/EntityHitAfterEvent/killaura.js";
// Import WorldInitializeAfter Events
import { Registry } from "./penrose/WorldInitializeAfterEvent/registry.js";
// Import SystemBefore Events
import { WatchDog } from "./penrose/SystemEvent/watchdog.js";
// Import ChatSendAfter Events
import { AfterPrefixCommand } from "./penrose/ChatSendAfterEvent/chat/afterprefixcommand.js";
import { TpRequestListener } from "./commands/utility/tpr.js";
import { afterAntiSpam } from "./penrose/ChatSendAfterEvent/chat/antispam.js";
// Import EntityDieAfter Events
import { DeathCoordinates } from "./penrose/EntityDieAfterEvent/death_coordinates.js";
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
ChatFilter();

// ChatSendAfter Events
AfterPrefixCommand();
TpRequestListener();
afterAntiSpam();

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
CrasherA();
NamespoofA();
NamespoofB();
BedrockValidate();
JesusA();
NoSlowA();
IllegalItemsA();
InvalidSprintA();
FlyA();
AntiKnockbackA();
AntiFallA();
AutoBan();
if (config.customcommands.freeze || config.modules.antiKillAura || config.modules.antinukerA) {
    freeze;
    freezeLeave();
    freezeJoin();
}

// BlockBreakAfter Events
XrayA();
NukerA();

// playerSpawnAfter Events
onJoin();
GlobalBanList();
hashCode();
onJoinrules(); // GUI

// BlockPlaceAfter Events
ScaffoldA();
IllegalItemsB();
ReachA();

// EntityHitAfter Events
ReachB();
KillAura();

// EntityDieAfter Events
DeathCoordinates();

// SystemBefore Events
WatchDog();
