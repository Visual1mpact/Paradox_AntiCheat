/* eslint no-var: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function statsHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.stats) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: stats
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: stats [optional]
§4[§6Optional§4]§r: username, help
§4[§6Description§4]§r: Shows logs from the specified user.
§4[§6Examples§4]§r:
    ${prefix}stats ${disabler(player.nameTag)}
    ${prefix}stats help
"}]}`)
}

/**
 * @name stats
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function stats(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/stats.js:8)");
    }
    
    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag(crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.stats) {
        return statsHelp(player, prefix);
    }

    if (!player.hasTag('notify')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You need to enable cheat notifications."}]}`);
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

    return player.runCommand(`execute "${disabler(member.nameTag)}" ~~~ function tools/stats`);
}
