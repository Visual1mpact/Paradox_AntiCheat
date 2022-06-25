/* eslint no-var: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

let isSilent;

function kickHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.kick) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: kick`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: kick [optional]`,
        `§4[§6Optional§4]§r: username, reason, help`,
        `§4[§6Description§4]§r: Kick the specified user and optionally gives a reason.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}kick ${player.name}`,
        `    ${prefix}kick ${player.name} Hacker!`,
        `    ${prefix}kick ${player.name} Stop trolling!`,
        `    ${prefix}kick help`,
    ]);
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
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // make sure they dont kick themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot kick yourself.`);
    }

    try {
        if (!isSilent) {
            player.runCommand(`kick ${JSON.stringify(player.name)} ${reason}`);
        } else {
            member.triggerEvent('paradox:kick');
        }
    } catch (error) {
        console.warn(`${new Date()} | ` + error);
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r I was unable to kick that player! Error: ${error}`);
    }
    return sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has kicked ${member.nameTag}§r. Reason: ${reason}`);
}
