import config from "../data/config.js";
import { disabler } from "../util.js";

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
import { unbanwindow } from "./settings/unbanwindow.js";
import { prefix } from "./moderation/prefix.js";
import { chatranks } from "./settings/chatranks.js";
import { stackban } from "./settings/stackban.js";
import { lockdown } from "./moderation/lockdown.js";
import { punish } from "./moderation/punish.js";
import { sethome } from "./utility/sethome.js";
import { gohome } from "./utility/gohome.js";
import { tpa } from "./moderation/tpa.js";
import { antiteleport } from "./settings/antiteleport.js";
import { tester } from "./moderation/tester.js";
import { illegalitemsD } from "./settings/illegalitemsd.js";
import { listhome } from "./utility/listhome.js";
import { delhome } from "./utility/delhome.js";
import { illegalEnchant } from "./settings/illegalenchant.js";
import { illegalLores } from "./settings/illegallores.js";
import { despawn } from "./moderation/despawn.js";
import { reachC } from "./settings/reachc.js";
import { performance } from "./utility/performance.js";
import { hotbar } from "./utility/hotbar.js";
import { rbcr } from "./settings/rbcr.js";
import { ops } from "./settings/oneplayersleep.js";

/**
 * @name commandHandler
 * @param {object} player - The player that has sent the message
 * @param {object} message - Message data
 */

export function commandHandler(player, message) {
    // validate that required params are defined
    if (!player) {
        return console.warn(`${new Date()} | ` + "Error: ${player} isnt defined. Did you forget to pass it? (./commands/handler.js:45)");
    }
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/handler.js:46)");
    }

    if (config.debug) {
        console.warn(`${new Date()} | ` + "did run command handler");
    }

    // checks if the message starts with our prefix, if not exit
    if (!message.message.startsWith(config.customcommands.prefix)) {
        return;
    }

    let args = message.message.slice(config.customcommands.prefix.length).split(/ +/);

    const commandName = args.shift().toLowerCase();

    if (config.debug) {
        console.warn(`${new Date()} | "${disabler(player.nameTag)}" used the command: ${config.customcommands.prefix}${commandName} ${args.join(" ")}`);
    }

    switch (true) {
        case (commandName === "kick"):
            kick(message, args);
            break;
        case (commandName === "tag"):
            tag(message, args);
            break;
        case (commandName === "ban"):
            ban(message, args);
            break;
        case (commandName === "notify"):
            notify(message, args);
            break;
        case (commandName === "vanish"):
            vanish(message, args);
            break;
        case (commandName === "fly"):
            fly(message, args);
            break;
        case (commandName === "mute"):
            mute(message, args);
            break;
        case (commandName === "unmute"):
            unmute(message, args);
            break;
        case (commandName === "invsee"):
            invsee(message, args);
            break;
        case (commandName === "ecwipe"):
            ecwipe(message, args);
            break;
        case (commandName === "freeze"):
            freeze(message, args);
            break;
        case (commandName === "stats"):
            stats(message, args);
            break;
        case (commandName === "fullreport"):
            fullreport(message, args);
            break;
        case (commandName === "allowgma"):
            allowgma(message, args);
            break;
        case (commandName === "allowgmc"):
            allowgmc(message, args);
            break;
        case (commandName === "allowgms"):
            allowgms(message, args);
            break;
        case (commandName === "bedrockvalidate"):
            bedrockvalidate(message, args);
            break;
        case (commandName === "modules"):
            modules(message, args);
            break;
        case (commandName === "overridecbe"):
            overidecommandblocksenabled(message, args);
            break;
        case (commandName === "removecb"):
            removecommandblocks(message, args);
            break;
        case (commandName === "worldborder"):
            worldborders(message, args);
            break;
        case (config.customcommands.help && commandName === "help"):
            help(message);
            break;
        case (commandName === "credits"):
            credits(message, args);
            break;
        case (commandName === "op"):
            op(message, args);
            break;
        case (commandName === "deop"):
            deop(message, args);
            break;
        case (commandName === "clearchat"):
            clearchat(message, args);
            break;
        case (commandName === "autoclicker"):
            autoclick(message, args);
            break;
        case (commandName === "jesusa"):
            jesusA(message, args);
            break;
        case (commandName === "enchantedarmor"):
            enchantedarmor(message, args);
            break;
        case (commandName === "auracheck"):
            auracheck(message, args);
            break;
        case (commandName === "autoaura"):
            autokillaura(message, args);
            break;
        case (commandName === "antikb"):
            antiknockback(message, args);
            break;
        case (commandName === "report"):
            report(message, args);
            break;
        case (commandName === "badpackets1"):
            badpackets1(message, args);
            break;
        case (commandName === "spammera"):
            spammerA(message, args);
            break;
        case (commandName === "spammerb"):
            spammerB(message, args);
            break;
        case (commandName === "spammerc"):
            spammerC(message, args);
            break;
        case (commandName === "spammerd"):
            spammerD(message, args);
            break;
        case (commandName === "antispam"):
            antispam(message, args);
            break;
        case (commandName === "crashera"):
            crasherA(message, args);
            break;
        case (commandName === "namespoofa"):
            namespoofA(message, args);
            break;
        case (commandName === "namespoofb"):
            namespoofB(message, args);
            break;
        case (commandName === "reacha"):
            reachA(message, args);
            break;
        case (commandName === "reachb"):
            reachB(message, args);
            break;
        case (commandName === "noslowa"):
            noslowA(message, args);
            break;
        case (commandName === "invalidsprinta"):
            invalidsprintA(message, args);
            break;
        case (commandName === "flya"):
            flyA(message, args);
            break;
        case (commandName === "illegalitemsa"):
            illegalitemsA(message, args);
            break;
        case (commandName === "illegalitemsb"):
            illegalitemsB(message, args);
            break;
        case (commandName === "antiscaffolda"):
            antiscaffoldA(message, args);
            break;
        case (commandName === "antinukera"):
            antinukerA(message, args);
            break;
        case (commandName === "illegalitemsc"):
            illegalitemsC(message, args);
            break;
        case (commandName === "xraya"):
            xrayA(message, args);
            break;
        case (commandName === "unbanwindow"):
            unbanwindow(message, args);
            break;
        case (commandName === "prefix"):
            prefix(message, args);
            break;
        case (commandName === "chatranks"):
            chatranks(message, args);
            break;
        case (commandName === "antishulker"):
            antishulker(message, args);
            break;
        case (commandName === "stackban"):
            stackban(message, args);
            break;
        case (commandName === "lockdown"):
            lockdown(message, args);
            break;
        case (commandName === "punish"):
            punish(message, args);
            break;
        case (commandName === "sethome"):
            sethome(message, args);
            break;
        case (commandName === "gohome"):
            gohome(message, args);
            break;
        case (commandName === "tpa"):
            tpa(message, args);
            break;
        case (commandName === "antiteleport"):
            antiteleport(message, args);
            break;
        case (commandName === "tester"):
            tester(message, args);
            break;
        case (commandName === "illegalitemsd"):
            illegalitemsD(message, args);
            break;
        case (commandName === "listhome"):
            listhome(message, args);
            break;
        case (commandName === "delhome"):
            delhome(message, args);
            break;
        case (commandName === "illegalenchant"):
            illegalEnchant(message, args);
            break;
        case (commandName === "illegallores"):
            illegalLores(message, args);
            break;
        case (commandName === "despawn"):
            despawn(message, args);
            break;
        case (commandName === "reachc"):
            reachC(message, args);
            break;
        case (commandName === "performance"):
            performance(message, args);
            break;
        case (commandName === "hotbar"):
            hotbar(message, args);
            break;
        case (commandName === "rbcr"):
            rbcr(message, args);
            break;
        case (commandName === "ops"):
            ops(message, args);
            break;
        default:
            player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"The command !${commandName} does not exist. Try again!"}]}`);
            return message.cancel = true;
    }
}
