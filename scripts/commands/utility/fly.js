/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function flyHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.fly) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `§4[§6Command§4]§r: fly`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: fly [optional]`,
        `§4[§6Optional§4]§r: username, help`,
        `§4[§6Description§4]§r: Will grant player the ability to fly.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}fly ${player.name}`,
        `    ${prefix}fly help`,
    ])
}

function mayflydisable(player, member) {
    sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled fly mode for ${player === member ? 'themselves' : member.nameTag}.`)
}

function mayflyenable(player, member) {
    sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled fly mode for ${player === member ? 'themselves' : member.nameTag}.`)
}

/**
 * @name fly
 * @param {object} message - Message object
 * @param {array} args - (Optional) Additional arguments provided (optional).
 */
export function fly(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/fly.js:9)");
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
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.fly) {
        return flyHelp(player, prefix);
    }
    
    // try to find the player requested
    let member;
    if(args.length) {
        for (let pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
            }
        }
    }
    
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    let membertag = member.getTags();

    if (!membertag.includes('noflying') && !membertag.includes('flying')) {
        try {
            member.runCommand(`ability @s mayfly true`);
            member.addTag('flying');
            mayflyenable(player, member);
        } catch (Error) {
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Education Edition is disabled in this world.`);
        }
        return;
    }

    if (membertag.includes('flying')) {
        member.addTag('noflying');
    }

    if (member.hasTag('noflying')) {
        try {
            member.runCommand(`ability @s mayfly false`);
            member.removeTag('flying');
            mayflydisable(player, member);
            member.removeTag('noflying');
        } catch (error) {
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Education Edition is disabled in this world.`);
        }
        return;
    }
}
