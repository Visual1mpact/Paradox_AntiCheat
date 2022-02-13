import config from "../data/config.js";

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
import { allowgma } from "./settings/allowgma.js";
import { allowgmc } from "./settings/allowgmc.js";
import { allowgms } from "./settings/allowgms.js";
import { bedrockvalidate } from "./settings/bedrockvalidate.js";
import { modules } from "./settings/modules.js";
import { nofrostwalker } from "./settings/nofrostwalker.js";
import { npc } from "./settings/npc.js";
import { overidecommandblocksenabled } from "./settings/overidecommandblocksenabled.js";
import { removecommandblocks } from "./settings/removecommandblocks.js";
import { worldborder } from "./settings/worldborder.js";
import { autoclicker } from "./settings/autoclicker.js";
import { jesus } from "./settings/jesus.js";
import { phase } from "./settings/phase.js";
import { enchantedarmor } from "./settings/enchantedarmor.js";
import { antikb } from "./settings/antikb.js";
import { autoaura } from "./settings/autoaura.js";
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
        console.warn(`${new Date()} | ${player.nameTag} used the command: ${config.customcommands.prefix}${commandName} ${args.join(" ")}`);
    }

    switch (true) {
        case (config.customcommands.kick && commandName === "kick"):
            kick(message, args);
            break;
        case (config.customcommands.tag && commandName === "tag"):
            tag(message, args);
            break;
        case (config.customcommands.ban && commandName === "ban"):
            ban(message, args);
            break;
        case (config.customcommands.notify && commandName === "notify"):
            notify(message);
            break;
        case (config.customcommands.vanish && commandName === "vanish"):
            vanish(message);
            break;
        case (config.customcommands.fly && commandName === "fly"):
            fly(message, args);
            break;
        case (config.customcommands.mute && commandName === "mute"):
            mute(message, args);
            break;
        case (config.customcommands.unmute && commandName === "unmute"):
            unmute(message, args);
            break;
        case (config.customcommands.invsee && commandName === "invsee"):
            invsee(message, args);
            break;
        case (config.customcommands.ecwipe && commandName === "ecwipe"):
            ecwipe(message, args);
            break;
        case (config.customcommands.freeze && commandName === "freeze"):
            freeze(message, args);
            break;
        case (config.customcommands.stats && commandName === "stats"):
            stats(message, args);
            break;
        case (config.customcommands.fullreport && commandName === "fullreport"):
            fullreport(message);
            break;
        case (config.customcommands.allowgma && commandName === "allowgma"):
            allowgma(message);
            break;
        case (config.customcommands.allowgmc && commandName === "allowgmc"):
            allowgmc(message);
            break;
        case (config.customcommands.allowgms && commandName === "allowgms"):
            allowgms(message);
            break;
        case (config.customcommands.bedrockvalidate && commandName === "bedrockvalidate"):
            bedrockvalidate(message);
            break;
        case (config.customcommands.modules && commandName === "modules"):
            modules(message);
            break;
        case (config.customcommands.nofrostwalker && commandName === "nofrostwalker"):
            nofrostwalker(message);
            break;
        case (config.customcommands.npc && commandName === "npc"):
            npc(message);
            break;
        case (config.customcommands.overidecommandblocksenabled && commandName === "overridecbe"):
            overidecommandblocksenabled(message);
            break;
        case (config.customcommands.removecommandblocks && commandName === "removecb"):
            removecommandblocks(message);
            break;
        case (config.customcommands.worldborder && commandName === "worldborder"):
            worldborder(message);
            break;
        case (config.customcommands.help && commandName === "help"):
            help(message);
            break;
        case (config.customcommands.credits && commandName === "credits"):
            credits(message);
            break;
        case (config.customcommands.op && commandName === "op"):
            op(message, args);
            break;
        case (config.customcommands.op && commandName === "deop"):
            deop(message, args);
            break;
        case (config.customcommands.clearchat && commandName === "clearchat"):
            clearchat(message);
            break;
        case (config.customcommands.autoclicker && commandName === "autoclicker"):
            autoclicker(message);
            break;
        case (config.customcommands.jesus && commandName === "jesus"):
            jesus(message);
            break;
        case (config.customcommands.phase && commandName === "phase"):
            phase(message);
            break;
        case (config.customcommands.enchantedarmor && commandName === "enchantedarmor"):
            enchantedarmor(message);
            break;
        case (config.customcommands.auracheck && commandName === "auracheck"):
            auracheck(message, args);
            break;
        case (config.customcommands.autoaura && commandName === "autoaura"):
            autoaura(message);
            break;
        case (config.customcommands.antikb && commandName === "antikb"):
            antikb(message);
            break;
        default:
            return player.dimension.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"There was an error while trying to run this command. Please read console output"}]}`);
    }
}
