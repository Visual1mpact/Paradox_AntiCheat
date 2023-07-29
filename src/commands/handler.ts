import { ChatSendAfterEvent, ChatSendBeforeEvent, Player } from "@minecraft/server";
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
import { auracheck } from "./settings/auracheck.js";
import { report } from "./utility/report.js";
import { badpackets1 } from "./settings/badpackets1.js";
import { spammerA } from "./settings/spammera.js";
import { spammerB } from "./settings/spammerb.js";
import { spammerC } from "./settings/spammerc.js";
import { antispam } from "./settings/antispam.js";
import { crasherA } from "./settings/crashera.js";
import { namespoofA } from "./settings/namespoofa.js";
import { namespoofB } from "./settings/namespoofb.js";
import { reachA } from "./settings/reacha.js";
import { noslowA } from "./settings/noslowa.js";
import { invalidsprintA } from "./settings/invalidsprinta.js";
import { flyA } from "./settings/flya.js";
import { illegalitemsA } from "./settings/illegalitemsa.js";
import { antiscaffoldA } from "./settings/antiscaffolda.js";
import { antinukerA } from "./settings/antinukera.js";
import { illegalitemsB } from "./settings/illegalitemsb.js";
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
import { illegalitemsC } from "./settings/illegalitemsc.js";
import { listhome } from "./utility/listhome.js";
import { delhome } from "./utility/delhome.js";
import { illegalEnchant } from "./settings/illegalenchant.js";
import { illegalLores } from "./settings/illegallores.js";
import { despawn } from "./moderation/despawn.js";
import { reachB } from "./settings/reachb.js";
import { hotbar } from "./utility/hotbar.js";
import { ops } from "./settings/oneplayersleep.js";
import { salvage } from "./settings/salvagesystem.js";
import { badpackets2 } from "./settings/badpackets2.js";
import { give } from "./utility/give.js";
import { clearlag } from "./settings/lagclear.js";
import { listitems } from "./debug_commands/listitems.js";
import { antifallA } from "./settings/antifalla.js";
import { showrules } from "./moderation/showrules.js";
import { paradoxUI } from "./moderation/paradoxui.js";
import { TeleportRequestHandler } from "./utility/tpr.js";
import { autoban } from "./settings/autoban.js";
import { paradoxVersion } from "./utility/paradoxVersion.js";
import { biome } from "./utility/biome.js";
import { afk } from "./settings/afk.js";
const commandDefinitions: Record<string, (data: Player | ChatSendAfterEvent, args: string[], fullArgs: string) => void> = Object.setPrototypeOf(
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
        antikillaura: auracheck,
        antikb: antiknockback,
        report: report,
        badpackets1: badpackets1,
        spammera: spammerA,
        spammerb: spammerB,
        spammerc: spammerC,
        antispam: antispam,
        crashera: crasherA,
        namespoofa: namespoofA,
        namespoofb: namespoofB,
        reacha: reachA,
        noslowa: noslowA,
        invalidsprinta: invalidsprintA,
        flya: flyA,
        antifalla: antifallA,
        illegalitemsa: illegalitemsA,
        antiscaffolda: antiscaffoldA,
        antinukera: antinukerA,
        illegalitemsb: illegalitemsB,
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
        illegalitemsc: illegalitemsC,
        listhome: listhome,
        delhome: delhome,
        illegalenchant: illegalEnchant,
        illegallores: illegalLores,
        despawn: despawn,
        reachb: reachB,
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
        autoban: autoban,
        version: paradoxVersion,
        biome: biome,
        afk: afk,
    },
    null
);

/**
 * @name commandHandler
 * @param {Player} player - The player that has sent the message
 * @param {ChatSendBeforeEvent} message - Message data
 */

export function commandHandler(player: Player, message: ChatSendBeforeEvent): Promise<void> | void {
    if (config.debug) {
        console.warn(`${new Date()} | did run command handler`);
    }

    // checks if the message starts with our prefix, if not exit
    if (!message.message.startsWith(config.customcommands.prefix)) return void 0;

    const args = message.message.slice(config.customcommands.prefix.length).split(/ +/);

    const commandName = args.shift().toLowerCase();

    if (config.debug) console.warn(`${new Date()} | "${player.name}" used the command: ${config.customcommands.prefix}${commandName} ${args.join(" ")}`);

    if (!(commandName in commandDefinitions)) {
        message.cancel = true;
        message.sendToTargets = true;
        message.setTargets([]);
        message.message = "";
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r The command ${config.customcommands.prefix}${commandName} does not exist. Try again!`);
    }

    // Do not broadcast any message to any targets
    message.sendToTargets = true;
}

export function handleCommandAfterSend(chatSendAfterEvent: ChatSendAfterEvent): void {
    // Logic for handling the command after the message is sent
    if (!chatSendAfterEvent.message.startsWith(config.customcommands.prefix)) return;

    // Do not broadcast any message to any targets
    chatSendAfterEvent.sendToTargets = true;

    const args = chatSendAfterEvent.message.slice(config.customcommands.prefix.length).split(/ +/);

    const commandName = args.shift().toLowerCase();

    commandDefinitions[commandName](chatSendAfterEvent, args, chatSendAfterEvent.message.slice(config.customcommands.prefix.length + commandName.length + 1));

    chatSendAfterEvent.message = "";
}
