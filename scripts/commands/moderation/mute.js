/* eslint no-var: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function muteHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.mute) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
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
"}]}`);
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

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
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
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    // Check for hash/salt and validate password for members
    let memberHash = member.getDynamicProperty('hash');
    let memberSalt = member.getDynamicProperty('salt');
    let memberEncode;
    try {
        memberEncode = crypto(memberSalt, config.modules.encryption.password);
    } catch (error) {}

    // make sure they dont mute themselves
    if (disabler(member.nameTag) === disabler(player.nameTag)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You cannot mute yourself."}]}`);
    }

    // make sure staff dont mute staff
    if (memberEncode === memberHash) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You cannot mute staff members."}]}`);
    }

    // If not already muted then tag
    if (!member.hasTag('isMuted')) {
        member.addTag('isMuted');
    } else {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"${disabler(member.nameTag)} is already muted."}]}`);
    }
    // If Education Edition is enabled then legitimately mute them
    try {
        player.runCommand(`ability "${disabler(member.nameTag)}" mute true`);
    } catch (error) {}
    player.runCommand(`tellraw "${disabler(member.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You have been muted. Reason: ${reason}"}]}`);
    return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has muted ${disabler(member.nameTag)}. Reason: ${reason}"}]}`);
}
