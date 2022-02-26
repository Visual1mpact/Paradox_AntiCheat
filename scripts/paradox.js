// Import Customs
import * as Minecraft from "mojang-minecraft";
import config from "./data/config.js";
import { setTickInterval } from "./timer/scheduling.js";
import { TickFreeze } from "./penrose/tickevent/freeze/freeze.js";
// Import BeforeChat Events
import { BadPackets2 } from "./penrose/beforechatevent/spammer/badpackets_2.js";
import { SpammerA } from "./penrose/beforechatevent/spammer/spammer_a.js";
import { SpammerB } from "./penrose/beforechatevent/spammer/spammer_b.js";
import { SpammerC } from "./penrose/beforechatevent/spammer/spammer_c.js";
import { SpammerD } from "./penrose/beforechatevent/spammer/spammer_d.js";
import { PrefixCommand } from "./penrose/beforechatevent/chat/prefixcommand.js";
import { ChatFilter } from "./penrose/beforechatevent/chat/chatfilter.js";
import { AntiSpam, timer } from "./penrose/beforechatevent/chat/antispam.js";
// Import Tick Events
import { GlobalBanList } from "./penrose/tickevent/ban/globalbanlist.js";
import { ServerBan } from "./penrose/tickevent/ban/serverban.js";
import { CrasherA } from "./penrose/tickevent/crasher/crasher_a.js";
import { NamespoofA } from "./penrose/tickevent/namespoof/namespoof_a.js";
import { NamespoofB } from "./penrose/tickevent/namespoof/namespoof_b.js";
import { PlayerPosition } from "./penrose/tickevent/coordinates/playerposition.js";
import { BedrockValidate } from "./penrose/tickevent/bedrock/bedrockvalidate.js";
import { JesusB } from "./penrose/tickevent/jesus/jesus_b.js";
import { NoSlowA } from "./penrose/tickevent/noslow/noslow_a.js";
import { IllegalItemsA } from "./penrose/tickevent/illegalitems/illegalitems_a.js";
import { InvalidSprintA } from "./penrose/tickevent/invalidsprint/invalidsprint_a.js";
import { FlyA } from "./penrose/tickevent/fly/fly_a.js";
import { FlyB } from "./penrose/tickevent/fly/fly_b.js";
import { AntiKnockbackA } from "./penrose/tickevent/knockback/antikb_a.js";
// Import BlockBreak Events
import { XrayA } from "./penrose/blockbreakevent/xray/xray_a.js";
import { NukerA } from "./penrose/blockbreakevent/nuker/nuker_a.js";
import { ReachB } from "./penrose/blockbreakevent/reach/reach_b.js";
// Import JoinPlayer Events
import { GametestCheck } from "./penrose/playerjoinevent/gametestloaded/gametestcheck.js";
// Import BlockPlace Events
import { ScaffoldA } from "./penrose/blockplaceevent/scaffold/scaffold_a.js";
import { PlaceflagsA } from "./penrose/blockplaceevent/placeflags/placeflags_a.js";
import { ReachA } from "./penrose/blockplaceevent/reach/reach_a.js";

// Self explanatory
const World = Minecraft.world;

// Define globally within script
let hastag;


// BeforeChat Events
if (config.modules.badpackets2.enabled) {
    BadPackets2();
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
GlobalBanList();
ServerBan();
PlayerPosition();

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

if (config.modules.jesusB.enabled) {
    JesusB();
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

if (config.modules.flyB.enabled) {
    setTickInterval(FlyB, 20);
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

// BlockPlace Events
if  (config.modules.antiscaffoldA.enabled) {
    ScaffoldA();
}

if  (config.modules.anticbeC.enabled) {
    PlaceflagsA();
}

if (config.modules.reachA.enabled) {
    ReachA();
}