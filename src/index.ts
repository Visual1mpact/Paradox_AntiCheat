// Import custom statements
import config from "./data/config.js";
import { kickablePlayers } from "./kickcheck.js";
import { sendMsgToPlayer, sendMsg, startTimer, flag, titleCase, toCamelCase, banMessage, crypto, getPrefix, setTimer, getScore, setScore, isTimerExpired, UUID, decryptString, encryptString, resetTag } from "./util";
import { dynamicPropertyRegistry } from "./penrose/worldinitializeevent/registry";
import { commandHandler } from "./commands/handler";
import { enchantmentSlot } from "./data/enchantments";
import salvageable from "./data/salvageable";
import { whitelist } from "./data/whitelistitems";
import maxItemStack, { defaultMaxItemStack } from "./data/maxstack";
import { illegalitems } from "./data/itemban";
import { xrayblocks } from "./data/xray";
import { iicWhitelist } from "./data/illegalitemsc_whitelist.js";
import { banplayer } from "./data/globalban.js";
import { onJoinData } from "./data/onjoindata.js";
import { clearItems } from "./data/clearlag.js";
import { nonstaffhelp } from "./commands/moderation/nonstaffhelp";
import { paradoxui } from "./gui/paradoxui";
import { ShowRules } from "./gui/showrules/showrules.js";

// Import @minecraft/server
import {
    BeforeChatEvent,
    Player,
    system,
    Vector,
    world,
    Entity,
    ItemStack,
    Items,
    MinecraftEnchantmentTypes,
    Enchantment,
    BeforeItemUseOnEvent,
    EntityInventoryComponent,
    ItemEnchantsComponent,
    BlockBreakEvent,
    Block,
    BlockPlaceEvent,
    BlockProperties,
    BlockInventoryComponentContainer,
    BlockInventoryComponent,
    MinecraftBlockTypes,
    EntityHitEvent,
    PlayerSpawnEvent,
    EntityQueryOptions,
    GameMode,
    InventoryComponentContainer,
    EntityItemComponent,
    MinecraftEffectTypes,
    Dimension,
    DynamicPropertiesDefinition,
    MinecraftEntityTypes,
    WorldInitializeEvent,
    MinecraftItemTypes,
} from "@minecraft/server";

// Tickevent
import { OPS } from "./penrose/tickevent/oneplayersleep/oneplayersleep.js";
import { Hotbar } from "./penrose/tickevent/hotbar/hotbar.js";
import { VerifyPermission } from "./penrose/tickevent/noperms/verifypermission.js";
import { BadPackets2 } from "./penrose/tickevent/badpackets2/badpackets2.js";
import { ClearLag } from "./penrose/tickevent/clearlag/clearlag.js";
import { AntiFallA } from "./penrose/tickevent/antifalla/antifall_a.js";
import { TickFreeze } from "./penrose/tickevent/freeze/freeze.js";
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
import { Survival } from "./penrose/tickevent/gamemode/survival.js";
import { Adventure } from "./penrose/tickevent/gamemode/adventure.js";
import { Creative } from "./penrose/tickevent/gamemode/creative.js";
import { IllegalItemsD } from "./penrose/tickevent/illegalitems/illegalitems_d.js";

// BeforeChat Event
import { BadPackets1 } from "./penrose/beforechatevent/spammer/badpackets_1.js";
import { SpammerA } from "./penrose/beforechatevent/spammer/spammer_a.js";
import { SpammerB } from "./penrose/beforechatevent/spammer/spammer_b.js";
import { SpammerC } from "./penrose/beforechatevent/spammer/spammer_c.js";
import { SpammerD } from "./penrose/beforechatevent/spammer/spammer_d.js";
import { PrefixCommand } from "./penrose/beforechatevent/chat/prefixcommand.js";
import { ChatFilter } from "./penrose/beforechatevent/chat/chatfilter.js";
import { AntiSpam } from "./penrose/beforechatevent/chat/antispam.js";

// BlockBreak Event
import { XrayA } from "./penrose/blockbreakevent/xray/xray_a.js";
import { NukerA } from "./penrose/blockbreakevent/nuker/nuker_a.js";
import { ReachB } from "./penrose/blockbreakevent/reach/reach_b.js";

// PlayerSpawn Event
import { GametestCheck } from "./penrose/playerspawnevent/gametestloaded/gametestcheck.js";
import { onJoin } from "./penrose/playerspawnevent/onjoin/onjoin.js";
import { GlobalBanList } from "./penrose/playerspawnevent/ban/globalbanlist.js";
import { hashCode } from "./penrose/playerspawnevent/hash/hash.js";

// BlockPlace Event
import { ScaffoldA } from "./penrose/blockplaceevent/scaffold/scaffold_a.js";
import { IllegalItemsC } from "./penrose/blockplaceevent/illegalitems/illegalitems_c.js";
import { ReachA } from "./penrose/blockplaceevent/reach/reach_a.js";

// GUI PlayerSpawn Event
import { onJoinrules } from "./gui/playerspawnevent/rules/rules.js";

// BeforeItemUseOn Event
import { IllegalItemsB } from "./penrose/beforeitemuseonevent/illegalitems/illegalitems_b.js";

// EntityHit Event
import { ReachC } from "./penrose/entityhitevent/reach_c.js";
import { KillAura } from "./penrose/entityhitevent/killaura.js";

// WorldInitialize Event
import { Registry } from "./penrose/worldinitializeevent/registry.js";

// System Event
import { WatchDog } from "./penrose/systemevent/watchdog.js";

export {
    Adventure,
    AntiFallA,
    AntiKnockbackA,
    AntiSpam,
    banMessage,
    banplayer,
    BadPackets1,
    BadPackets2,
    BedrockValidate,
    BeforeChatEvent,
    BeforeItemUseOnEvent,
    Block,
    BlockBreakEvent,
    BlockInventoryComponent,
    BlockInventoryComponentContainer,
    BlockPlaceEvent,
    BlockProperties,
    ChatFilter,
    clearItems,
    ClearLag,
    commandHandler,
    config,
    Creative,
    CrasherA,
    crypto,
    Dimension,
    decryptString,
    defaultMaxItemStack,
    DynamicPropertiesDefinition,
    dynamicPropertyRegistry,
    Enchantment,
    enchantmentSlot,
    encryptString,
    Entity,
    EntityHitEvent,
    EntityInventoryComponent,
    EntityItemComponent,
    EntityQueryOptions,
    flag,
    FlyA,
    GameMode,
    GametestCheck,
    getPrefix,
    getScore,
    GlobalBanList,
    hashCode,
    Hotbar,
    iicWhitelist,
    illegalitems,
    IllegalItemsA,
    IllegalItemsB,
    IllegalItemsC,
    IllegalItemsD,
    InvalidSprintA,
    InventoryComponentContainer,
    isTimerExpired,
    ItemEnchantsComponent,
    Items,
    ItemStack,
    JesusA,
    kickablePlayers,
    KillAura,
    maxItemStack,
    MinecraftBlockTypes,
    MinecraftEffectTypes,
    MinecraftEnchantmentTypes,
    MinecraftEntityTypes,
    MinecraftItemTypes,
    NamespoofA,
    NamespoofB,
    nonstaffhelp,
    NoPerms,
    NoSlowA,
    NukerA,
    onJoin,
    onJoinData,
    onJoinrules,
    OPS,
    paradoxui,
    Player,
    PlayerPosition,
    PlayerSpawnEvent,
    PrefixCommand,
    ReachA,
    ReachB,
    ReachC,
    Registry,
    resetTag,
    salvageable,
    ScaffoldA,
    sendMsg,
    sendMsgToPlayer,
    ServerBan,
    setScore,
    setTimer,
    ShowRules,
    SpammerA,
    SpammerB,
    SpammerC,
    SpammerD,
    startTimer,
    Survival,
    system,
    TickFreeze,
    titleCase,
    toCamelCase,
    UUID,
    Vanish,
    Vector,
    VerifyPermission,
    WatchDog,
    whitelist,
    world,
    WorldInitializeEvent,
    WorldBorder,
    XrayA,
    xrayblocks,
};
