import { BeforeChatEvent, Player } from "@minecraft/server";
import config from "../data/config.js";
import { sendMsgToPlayer } from "../util.js";

// import all our commands
import { kick } from "./moderation/kick.js";
import { help } from "./moderation/help.js";
import { notify } from "./moderation/notify.js";
import { op } from "./moderation/op.js";
import { deop } from "./moderation/deop.js";
import { ban } from "./moderation/ban.js";
import { mute } from "./moderation/mute.js";
import { unmute } from "./moderation/unmute.js";
import { credits } from "./moderation/credits.js";
import { modules } from "./moderation/modules.js";
import { allowgma } from "./settings/allowgma.js";
import { allowgmc } from "./settings/allowgmc.js";
import { allowgms } from "./settings/allowgms.js";
import { bedrockvalidate } from "./settings/bedrockvalidate.js";
import { overidecommandblocksenabled } from "./settings/overidecommandblocksenabled.js";
import { removecommandblocks } from "./settings/removecommandblocks.js";
import { worldborders } from "./settings/worldborder.js";
import { autoclick } from "./settings/autoclicker.js";
import { jesusA } from "./settings/jesusa.js";
import { enchantedarmor } from "./settings/enchantedarmor.js";
import { antiknockback } from "./settings/antikb.js";
import { autokillaura } from "./settings/autoaura.js";
import { antishulker } from "./settings/antishulker.js";
import { tag } from "./utility/tag.js";
import { ecwipe } from "./utility/ecwipe.js";
import { freeze } from "./utility/freeze.js";
import { stats } from "./utility/stats.js";
import { fullreport } from "./utility/fullreport.js";
import { vanish } from "./utility/vanish.js";
import { fly } from "./utility/fly.js";
import { invsee } from "./utility/invsee.js";
import { clearchat } from "./utility/clearchat.js";
import { auracheck } from "./utility/auracheck.js";
import { report } from "./utility/report.js";
import { badpackets1 } from "./settings/badpackets1.js";
import { spammerA } from "./settings/spammera.js";
import { spammerB } from "./settings/spammerb.js";
import { spammerC } from "./settings/spammerc.js";
import { spammerD } from "./settings/spammerd.js";
import { antispam } from "./settings/antispam.js";
import { crasherA } from "./settings/crashera.js";
import { namespoofA } from "./settings/namespoofa.js";
import { namespoofB } from "./settings/namespoofb.js";
import { reachA } from "./settings/reacha.js";
import { reachB } from "./settings/reachb.js";
import { noslowA } from "./settings/noslowa.js";
import { invalidsprintA } from "./settings/invalidsprinta.js";
import { flyA } from "./settings/flya.js";
import { illegalitemsA } from "./settings/illegalitemsa.js";
import { illegalitemsB } from "./settings/illegalitemsb.js";
import { antiscaffoldA } from "./settings/antiscaffolda.js";
import { antinukerA } from "./settings/antinukera.js";
import { illegalitemsC } from "./settings/illegalitemsc.js";
import { xrayA } from "./settings/xraya.js";
import { unban } from "./moderation/unban.js";
import { prefix } from "./moderation/prefix.js";
import { chatranks } from "./settings/chatranks.js";
import { stackban } from "./settings/stackban.js";
import { lockdown } from "./moderation/lockdown.js";
import { punish } from "./moderation/punish.js";
import { sethome } from "./utility/sethome.js";
import { gohome } from "./utility/gohome.js";
import { tpa } from "./moderation/tpa.js";
import { illegalitemsD } from "./settings/illegalitemsd.js";
import { listhome } from "./utility/listhome.js";
import { delhome } from "./utility/delhome.js";
import { illegalEnchant } from "./settings/illegalenchant.js";
import { illegalLores } from "./settings/illegallores.js";
import { despawn } from "./moderation/despawn.js";
import { reachC } from "./settings/reachc.js";
import { hotbar } from "./utility/hotbar.js";
import { ops } from "./settings/oneplayersleep.js";
import { salvage } from "./settings/salvagesystem.js";
import { badpackets2 } from "./settings/badpackets2.js";
import { evalCmd } from "../debug/eval.js";
import { crasherB } from "./settings/crasherb.js";
import { give } from "./utility/give.js";
import { clearlag } from "./settings/lagclear.js";
import { listitems } from "./debug_commands/listitems.js";
import { dpwcleanup } from "./utility/dpwcleanup.js";

const commandDefinitions: Record<string, (data: BeforeChatEvent, args: string[], fullArgs: string) => void> = Object.setPrototypeOf(
    {
        eval: evalCmd,
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
        crasherb: crasherB,
        namespoofa: namespoofA,
        namespoofb: namespoofB,
        reacha: reachA,
        reachb: reachB,
        noslowa: noslowA,
        invalidsprinta: invalidsprintA,
        flya: flyA,
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
        dpwcleanup: dpwcleanup,
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
    message.targets = [];
    message.sendToTargets = true;

    if (!(commandName in commandDefinitions)) return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r The command ${config.customcommands.prefix}${commandName} does not exist. Try again!`);

    commandDefinitions[commandName](message, args, message.message.slice(config.customcommands.prefix.length + commandName.length + 1));

    message.message = "";

    return void 0;
}
