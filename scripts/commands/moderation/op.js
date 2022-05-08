/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { disabler, getPrefix } from "../../util.js";

const World = world;

function opHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.op) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: op
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: op <username> [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Grants permission to use Paradox AntiCheat features.
§4[§6Examples§4]§r:
    ${prefix}op ${disabler(player.nameTag)}
    ${prefix}op help
"}]}`)
}

/**
 * @name op
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function op(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/op.js:9)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.op) {
        return muteHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return opHelp(player, prefix);
    }
    
    // try to find the player requested
    let member;
    if (args.length) {
        for (let pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
            }
        }
    }
    
    if (!member) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    return player.runCommand(`execute "${disabler(member.nameTag)}" ~~~ function op`);
}
