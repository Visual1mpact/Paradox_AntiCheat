// Import Customs
import { world } from "mojang-minecraft";
import config from "./data/config.js";
import { setTickInterval } from "./timer/scheduling.js";
import { TickFreeze } from "./penrose/tickevent/freeze/freeze.js";
// Import BeforeChat Events
import { BadPackets1 } from "./penrose/beforechatevent/spammer/badpackets_1.js";
import { SpammerA } from "./penrose/beforechatevent/spammer/spammer_a.js";
import { SpammerB } from "./penrose/beforechatevent/spammer/spammer_b.js";
import { SpammerC } from "./penrose/beforechatevent/spammer/spammer_c.js";
import { SpammerD } from "./penrose/beforechatevent/spammer/spammer_d.js";
import { PrefixCommand } from "./penrose/beforechatevent/chat/prefixcommand.js";
import { ChatFilter } from "./penrose/beforechatevent/chat/chatfilter.js";
import { AntiSpam, timer } from "./penrose/beforechatevent/chat/antispam.js";
// Import Tick Events
import { ServerBan } from "./penrose/tickevent/ban/serverban.js";
import { CrasherA } from "./penrose/tickevent/crasher/crasher_a.js";
import { NamespoofA } from "./penrose/tickevent/namespoof/namespoof_a.js";
import { NamespoofB } from "./penrose/tickevent/namespoof/namespoof_b.js";
import { PlayerPosition } from "./penrose/tickevent/coordinates/playerposition.js";
import { BedrockValidate } from "./penrose/tickevent/bedrock/bedrockvalidate.js";
import { JesusA } from "./penrose/tickevent/jesus/jesus_a.js";
import { NoSlowA } from "./penrose/tickevent/noslow/noslow_a.js";
import { IllegalItemsA } from "./penrose/tickevent/illegalitems/illegalitems_a.js";
import { InvalidSprintA } from "./penrose/tickevent/invalidsprint/invalidsprint_a.js";
import { FlyA } from "./penrose/tickevent/fly/fly_a.js";
import { AntiKnockbackA } from "./penrose/tickevent/knockback/antikb_a.js";
import { NoPerms } from "./penrose/tickevent/noperms/nopermission.js";
import { WorldBorder } from "./penrose/tickevent/worldborder/worldborder.js";
import { Vanish } from "./penrose/tickevent/vanish/vanish.js";
// Import BlockBreak Events
import { XrayA } from "./penrose/blockbreakevent/xray/xray_a.js";
import { NukerA } from "./penrose/blockbreakevent/nuker/nuker_a.js";
import { ReachB } from "./penrose/blockbreakevent/reach/reach_b.js";
// Import JoinPlayer Events
import { GametestCheck } from "./penrose/playerjoinevent/gametestloaded/gametestcheck.js";
import { onJoin } from "./penrose/playerjoinevent/onjoin/onjoin.js";
import { GlobalBanList } from "./penrose/playerjoinevent/ban/globalbanlist.js";
// Import BlockPlace Events
import { ScaffoldA } from "./penrose/blockplaceevent/scaffold/scaffold_a.js";
import { IllegalItemsC } from "./penrose/blockplaceevent/illegalitems/illegalitems_c.js";
import { ReachA } from "./penrose/blockplaceevent/reach/reach_a.js";
// Import BeforeItemUse Events
import { IllegalItemsB } from "./penrose/beforeitemuseevent/illegalitems/illegalitems_b.js";

// Self explanatory
const World = world;

// Define globally within script
let hastag;

// BeforeChat Events
if (config.modules.badpackets1.enabled) {
    BadPackets1();
}

if (config.modules.spammerA.enabled) {
    SpammerA();
}

if (config.modules.spammerB.enabled) {
    SpammerB();
}

if (config.modules.spammerC.enabled) {
    SpammerC();
}

if (config.modules.spammerD.enabled) {
    SpammerD();
}

if (config.modules.antispam.enabled) {
    AntiSpam();
    setTickInterval(timer, config.modules.antispam.cooldown);
}

PrefixCommand();
ChatFilter();

// Tick Events
NoPerms();
PlayerPosition();
Vanish();

if (config.modules.worldBorder.enabled) {
    WorldBorder();
}

if (!config.modules.unbanWindow.enabled) {
    ServerBan();
}

if (config.modules.crasherA.enabled) {
    CrasherA();
}

if (config.modules.namespoofA.enabled) {
    NamespoofA();
}

if (config.modules.namespoofB.enabled) {
    NamespoofB();
}

if (config.modules.bedrockValidate.enabled && config.modules.bedrockValidate.overworld || config.modules.bedrockValidate.enabled && config.modules.bedrockValidate.nether) {
    BedrockValidate();
}

if (config.modules.jesusA.enabled) {
    JesusA();
}

if (config.modules.noslowA.enabled) {
    NoSlowA();
}

if (config.modules.illegalitemsA.enabled) {
    IllegalItemsA();
}

if (config.modules.invalidsprintA.enabled) {
    InvalidSprintA();
}

if (config.modules.flyA.enabled) {
    FlyA();
}

if  (config.modules.antikbA.enabled) {
    AntiKnockbackA();
}

// Freeze Check
setTickInterval(() => {
    // run as each player
    for (let player of World.getPlayers()) {
        try {
            hastag = player.hasTag('freeze');
        } catch (error) {}
        if (hastag) {
            TickFreeze(player);
            hastag = null;
        }
    }
}, 60); // Executes every 3 seconds

// BlockBreak Events
if  (config.modules.xrayA.enabled) {
    XrayA();
}

if  (config.modules.antinukerA.enabled) {
    NukerA();
}

if (config.modules.reachB.enabled) {
    ReachB();
}

// JoinPlayer Events
GametestCheck();
onJoin();
GlobalBanList();

// BlockPlace Events
if  (config.modules.antiscaffoldA.enabled) {
    ScaffoldA();
}

if  (config.modules.illegalitemsC.enabled) {
    IllegalItemsC();
}

if (config.modules.reachA.enabled) {
    ReachA();
}

// BeforeItemUse Events
if (config.modules.illegalitemsB.enabled) {
    IllegalItemsB();
}