/* eslint no-var: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function unmuteHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.unmute) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: unmute
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: unmute [optional]
§4[§6Optional§4]§r: username, reason, help
§4[§6Description§4]§r: Unmutes the specified user and optionally gives a reason.
§4[§6Examples§4]§r:
    ${prefix}unmute ${disabler(player.nameTag)}
    ${prefix}unmute ${disabler(player.nameTag)} You may chat
    ${prefix}unmute help
"}]}`);
}

/**
 * @name unmute
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function unmute(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/unmute.js:8)");
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
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.unmute) {
        return unmuteHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return unmuteHelp(player, prefix);
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

    // If not already muted then tag
    if (member.hasTag('isMuted')) {
        member.removeTag('isMuted');
    } else {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"${disabler(member.nameTag)} is already unmuted."}]}`);
    }
    // If Education Edition is enabled then legitimately unmute
    try {
        player.runCommand(`ability "${disabler(member.nameTag)}" mute false`);
    } catch (error) {}
    player.runCommand(`tellraw "${disabler(member.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You have been unmuted."}]}`);
    return player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has unmuted ${disabler(member.nameTag)}. Reason: ${reason}"}]}`);
}
