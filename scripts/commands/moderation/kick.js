/* eslint no-var: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

let isSilent;

function kickHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.kick) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: kick
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: kick [optional]
§4[§6Optional§4]§r: username, reason, help
§4[§6Description§4]§r: Kick the specified user and optionally gives a reason.
§4[§6Examples§4]§r:
    ${prefix}kick ${disabler(player.nameTag)}
    ${prefix}kick ${disabler(player.nameTag)} Hacker!
    ${prefix}kick ${disabler(player.nameTag)} Stop trolling!
    ${prefix}kick help
"}]}`);
}

/**
 * @name kick
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function kick(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/kick.js:10)");
    }

    message.cancel = true;

    if (args[1] === "-s") {
        isSilent = true;
    } else {
        isSilent = false;
    }

    let player = message.sender;
    let reason = args.slice(1).join(" ").replace("-s", "") || "No reason specified";

    // make sure the user has permissions to run the command
    if (!player.hasTag('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.kick) {
        return kickHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return kickHelp(player, prefix);
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

    // make sure they dont kick themselves
    if (disabler(member.nameTag) === disabler(player.nameTag)) {
        return player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You cannot kick yourself."}]}`);
    }

    try {
        if (!isSilent) {
            player.runCommand(`kick "${member.name}" ${reason}`);
        } else {
            member.triggerEvent('paradox:kick');
        }
    } catch (error) {
        console.warn(`${new Date()} | ` + error);
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"I was unable to ban that player! Error: ${error}"}]}`);
    }
    return player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has kicked ${disabler(member.nameTag)} (Silent:${isSilent}). Reason: ${reason}"}]}`);
}
