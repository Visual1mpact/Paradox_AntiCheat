/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world, Location } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";

const World = world;

function tpaHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.antinukera) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `§4[§6Command§4]§r: tpa`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: tpa [optional]`,
        `§4[§6Optional§4]§r: username, help`,
        `§4[§6Description§4]§r: Teleport to another player.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}tpa ${player.name}`,
        `    ${prefix}tpa help`,
    ])
}

/**
 * @name tpa
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function tpa(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/tpa.js:10)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.tpa) {
        return tpaHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return tpaHelp(player, prefix);
    }
    
    // Try to find the player requested
    let member;
    if (args.length) {
        for (let pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
            }
        }
    }
    
    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // Let's teleport you to that player
    player.teleport(new Location(member.location.x, member.location.y, member.location.z), member.dimension, 0, 0);

    // Let you know that you have been teleported
    return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Teleported to ${member.nameTag}`);
}
