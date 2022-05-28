/* eslint no-var: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function ecWipeHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.ecwipe) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: ecwipe
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: ecwipe [optional]
§4[§6Optional§4]§r: username, help
§4[§6Description§4]§r: Will wipe out player's entire ender chest.
§4[§6Examples§4]§r:
    ${prefix}ecwipe ${disabler(player.nameTag)}
    ${prefix}ecwipe help
"}]}`)
}

/**
 * @name ecwipe
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided.
 */
export function ecwipe(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/ecwipe.js:8)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.ecwipe) {
        return ecWipeHelp(player, prefix);
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

    // There are 30 slots ranging from 0 to 29
    for (let slot = 0; slot < 30; slot++) {
        try {
            player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest ${slot} air`);
        } catch (error) {}
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Enderchest for ${disabler(member.nameTag)} has been wiped!"}]}`);
}
