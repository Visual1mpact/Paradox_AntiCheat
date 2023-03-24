import {
    allowgma,
    allowgmc,
    allowgms,
    antifallA,
    antiknockback,
    antinukerA,
    antiscaffoldA,
    antishulker,
    antispam,
    auracheck,
    autoclick,
    autokillaura,
    badpackets1,
    badpackets2,
    ban,
    bedrockvalidate,
    chatranks,
    clearchat,
    clearlag,
    crasherA,
    credits,
    delhome,
    deop,
    despawn,
    ecwipe,
    enchantedarmor,
    fly,
    flyA,
    freeze,
    fullreport,
    give,
    gohome,
    help,
    hotbar,
    illegalEnchant,
    illegalitemsA,
    illegalitemsB,
    illegalitemsC,
    illegalitemsD,
    illegalLores,
    invalidsprintA,
    invsee,
    jesusA,
    kick,
    listhome,
    listitems,
    lockdown,
    modules,
    mute,
    namespoofA,
    namespoofB,
    noslowA,
    notify,
    op,
    ops,
    overidecommandblocksenabled,
    paradoxUI,
    prefix,
    punish,
    reachA,
    reachB,
    reachC,
    removecommandblocks,
    report,
    salvage,
    sethome,
    showrules,
    spammerA,
    spammerB,
    spammerC,
    spammerD,
    stackban,
    stats,
    tag,
    TeleportRequestHandler,
    tpa,
    unban,
    unmute,
    vanish,
    worldborders,
    xrayA,
} from "../command_index";
import { BeforeChatEvent, config, Player, sendMsgToPlayer } from "../index";

const commandDefinitions: Record<string, (data: BeforeChatEvent, args: string[], fullArgs: string) => void> = Object.setPrototypeOf(
    {
        kick: kick,
        tag: tag,
        ban: ban,
        notify: notify,
        vanish: vanish,
        fly: fly,
        mute: mute,
        unmute: unmute,
        invsee: invsee,
        ecwipe: ecwipe,
        freeze: freeze,
        stats: stats,
        fullreport: fullreport,
        allowgma: allowgma,
        allowgmc: allowgmc,
        allowgms: allowgms,
        bedrockvalidate: bedrockvalidate,
        modules: modules,
        overridecbe: overidecommandblocksenabled,
        removecb: removecommandblocks,
        worldborder: worldborders,
        help: help,
        credits: credits,
        op: op,
        deop: deop,
        clearchat: clearchat,
        autoclicker: autoclick,
        jesusa: jesusA,
        enchantedarmor: enchantedarmor,
        auracheck: auracheck,
        autoaura: autokillaura,
        antikb: antiknockback,
        report: report,
        badpackets1: badpackets1,
        spammera: spammerA,
        spammerb: spammerB,
        spammerc: spammerC,
        spammerd: spammerD,
        antispam: antispam,
        crashera: crasherA,
        namespoofa: namespoofA,
        namespoofb: namespoofB,
        reacha: reachA,
        reachb: reachB,
        noslowa: noslowA,
        invalidsprinta: invalidsprintA,
        flya: flyA,
        antifalla: antifallA,
        illegalitemsa: illegalitemsA,
        illegalitemsb: illegalitemsB,
        antiscaffolda: antiscaffoldA,
        antinukera: antinukerA,
        illegalitemsc: illegalitemsC,
        xraya: xrayA,
        unban: unban,
        prefix: prefix,
        chatranks: chatranks,
        antishulker: antishulker,
        stackban: stackban,
        lockdown: lockdown,
        punish: punish,
        sethome: sethome,
        gohome: gohome,
        tpa: tpa,
        illegalitemsd: illegalitemsD,
        listhome: listhome,
        delhome: delhome,
        illegalenchant: illegalEnchant,
        illegallores: illegalLores,
        despawn: despawn,
        reachc: reachC,
        hotbar: hotbar,
        ops: ops,
        salvage: salvage,
        badpackets2: badpackets2,
        give: give,
        clearlag: clearlag,
        listitems: listitems,
        showrules: showrules,
        paradoxui: paradoxUI,
        tpr: TeleportRequestHandler,
    },
    null
);

/**
 * @name commandHandler
 * @param {Player} player - The player that has sent the message
 * @param {BeforeChatEvent} message - Message data
 */

export function commandHandler(player: Player, message: BeforeChatEvent) {
    if (config.debug) {
        console.warn(`${new Date()} | did run command handler`);
    }

    // checks if the message starts with our prefix, if not exit
    if (!message.message.startsWith(config.customcommands.prefix)) return void 0;

    let args = message.message.slice(config.customcommands.prefix.length).split(/ +/);

    const commandName = args.shift().toLowerCase();

    if (config.debug) console.warn(`${new Date()} | "${player.name}" used the command: ${config.customcommands.prefix}${commandName} ${args.join(" ")}`);

    message.cancel = true;
    message.setTargets([]);
    message.sendToTargets = true;

    if (!(commandName in commandDefinitions)) return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r The command ${config.customcommands.prefix}${commandName} does not exist. Try again!`);

    commandDefinitions[commandName](message, args, message.message.slice(config.customcommands.prefix.length + commandName.length + 1));

    message.message = "";

    return void 0;
}
