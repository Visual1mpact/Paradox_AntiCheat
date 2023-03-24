import {
    Registry,
    BadPackets1,
    SpammerA,
    SpammerB,
    SpammerC,
    SpammerD,
    AntiSpam,
    PrefixCommand,
    ChatFilter,
    ClearLag,
    BadPackets2,
    VerifyPermission,
    OPS,
    Hotbar,
    NoPerms,
    PlayerPosition,
    Vanish,
    IllegalItemsD,
    Survival,
    Adventure,
    Creative,
    WorldBorder,
    ServerBan,
    CrasherA,
    NamespoofA,
    NamespoofB,
    BedrockValidate,
    JesusA,
    NoSlowA,
    IllegalItemsA,
    InvalidSprintA,
    FlyA,
    AntiKnockbackA,
    AntiFallA,
    system,
    world,
    TickFreeze,
    XrayA,
    NukerA,
    ReachB,
    GametestCheck,
    onJoin,
    GlobalBanList,
    hashCode,
    onJoinrules,
    ScaffoldA,
    IllegalItemsC,
    ReachA,
    IllegalItemsB,
    ReachC,
    KillAura,
    WatchDog,
} from "./index";

// WorldInitialize Events
Registry();

// BeforeChat Events
BadPackets1();
SpammerA();
SpammerB();
SpammerC();
SpammerD();
AntiSpam();
PrefixCommand();
ChatFilter();

// Tick Events
ClearLag();
BadPackets2();
VerifyPermission;
OPS();
Hotbar();
NoPerms;
PlayerPosition;
Vanish;
IllegalItemsD();
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

/**
 * Freeze Check
 */
system.runInterval(() => {
    let hastag: boolean;
    // run as each player
    for (let player of world.getPlayers()) {
        try {
            hastag = player.hasTag("freeze");
        } catch (error) {}
        if (hastag) {
            TickFreeze(player);
            hastag = null;
        }
    }
}, 60); // Executes every 3 seconds

// BlockBreak Events
XrayA();
NukerA();
ReachB();

// playerSpawn Events
GametestCheck();
onJoin();
GlobalBanList();
hashCode();
onJoinrules(); // GUI
// BlockPlace Events
ScaffoldA();
IllegalItemsC();
ReachA();

// BeforeItemUseOn Events
IllegalItemsB();

// EntityHit Events
ReachC();
KillAura();

// System Events
WatchDog();
