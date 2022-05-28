/* eslint no-var: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function auraCheckHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.auracheck) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: auracheck
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: auracheck [optional]
§4[§6Optional§4]§r: username, help
§4[§6Description§4]§r: Will manually test player for killaura hack.
§4[§6Examples§4]§r:
    ${prefix}auracheck ${disabler(player.nameTag)}
    ${prefix}auracheck help
"}]}`)
}

/**
 * @name auracheck
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function auracheck(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/auracheck.js:8)");
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
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.auracheck) {
        return auraCheckHelp(player, prefix);
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

    return member.runCommand(`summon paradox:killaura ^ ^ ^-3`);
}
