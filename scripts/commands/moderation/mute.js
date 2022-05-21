/* eslint no-var: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function muteHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.mute) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: mute
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: mute [optional]
§4[§6Optional§4]§r: mute, reason, help
§4[§6Description§4]§r: Mutes the specified user and optionally gives reason.
§4[§6Examples§4]§r:
    ${prefix}mute ${disabler(player.nameTag)}
    ${prefix}mute ${disabler(player.nameTag)} Stop spamming!
    ${prefix}mute help
"}]}`)
}

/**
 * @name mute
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function mute(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/mute.js:8)");
    }

    message.cancel = true;

    let player = message.sender;
    let reason = args.slice(1).join(" ") || "No reason specified";

    // make sure the user has permissions to run the command
    if (!player.hasTag('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.mute) {
        return muteHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return muteHelp(player, prefix);
    }
    
    // try to find the player requested
    let member;
    for (let pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
    }

    if (!member) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    // make sure they dont mute themselves
    if (disabler(member.nameTag) === disabler(player.nameTag)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You cannot mute yourself."}]}`);
    }

    // make sure staff dont mute staff
    let verify = member.hasTag('Hash:' + crypto);
    if (verify) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You cannot mute staff members."}]}`);
    }

    try {
        player.runCommand(`ability "${disabler(member.nameTag)}" mute true`);
        player.runCommand(`tellraw "${disabler(member.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You have been muted. Reason: ${reason}"}]}`);
    } catch (error) {
        console.warn(`${new Date()} | ` + error);
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"I was unable to mute that player! You most likely dont have education edition enabled."}]}`);
    }
    return player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has muted ${disabler(member.nameTag)}. Reason: ${reason}"}]}`);
}
