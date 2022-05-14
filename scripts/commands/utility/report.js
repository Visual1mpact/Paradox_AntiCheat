import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { disabler, getPrefix } from "../../util.js";

const World = world;

function reportHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.report) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: report
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: report [optional]
§4[§6Optional§4]§r: username, reason, help
§4[§6Description§4]§r: Reports player's to online Staff for malicious activities.
§4[§6Examples§4]§r:
    ${prefix}report ${disabler(player.nameTag)}
    ${prefix}report ${disabler(player.nameTag)} Caught hacking!
    ${prefix}report help
"}]}`)
}

/**
 * @name report
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function report(message, args) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/ban.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    let reason = args.slice(1).join(" ") || "No reason specified";

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.report) {
        return reportHelp(player, prefix);
    }
    
    // Try to find the player requested
    let member;
    for (let pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
    }

    if (!member) {
        player.runCommand(`tellraw @s {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r !report <player> <reason>§r"}]}`);
        return player.runCommand(`tellraw @s {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    // Make sure they dont report themselves
    if (disabler(member.nameTag) === disabler(player.nameTag)) {
        return player.runCommand(`tellraw @s {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You cannot report yourself."}]}`);
    }

    // Prevent report spam
    if (player.lastReport === disabler(member.nameTag)) {
        return player.runCommand(`tellraw @s {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You have already reported this player!"}]}`);
    }
    player.lastReport = disabler(member.nameTag);

    player.runCommand(`tellraw @s {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You have reported ${disabler(member.nameTag)} for: ${reason}."}]}`);

    // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
    try {
        return player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has reported ${disabler(member.nameTag)} for: ${reason}"}]}`);
    } catch (error) {
        return;
    }
}
