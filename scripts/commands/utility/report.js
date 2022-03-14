import { world } from "mojang-minecraft";
import { disabler } from "../../util.js";

const World = world;

/**
 * @name report
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided.
 */
export function report(message, args) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/ban.js:7)");
    }
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? (./commands/moderation/ban.js:8)");
    }

    message.cancel = true;

    let player = message.sender;
    let reason = args.slice(1).join(" ") || "No reason specified";

    if (!args.length) {
        player.runCommand(`tellraw @s {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r !report <player> <reason>§r"}]}`);
        return player.runCommand(`tellraw @s {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to provide who to report!"}]}`);
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

    return player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has reported ${disabler(member.nameTag)} for: ${reason}"}]}`);
}
