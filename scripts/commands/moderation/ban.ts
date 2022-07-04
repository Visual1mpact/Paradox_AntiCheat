/* eslint no-var: "off"*/
import { BeforeChatEvent, Player, world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function banHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.ban) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: ban`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: ban [optional]`,
        `§4[§6Optional§4]§r: username, reason, help`,
        `§4[§6Description§4]§r: Bans the specified user and optionally gives a reason.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}ban ${player.name}`,
        `    ${prefix}ban ${player.name} Hacker!`,
        `    ${prefix}ban ${player.name} Caught exploiting!`,
        `    ${prefix}ban help`
    ]);
}

/**
 * @name ban
 * @param {BeforeChatEvent} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function ban(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/ban.js:31)");
    }

    message.cancel = true;

    let player = message.sender;
    let reason = args.slice(1).join(" ") || "No reason specified";

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return banHelp(player, prefix);
    }

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.ban) {
        return banHelp(player, prefix);
    }
    
    // try to find the player requested
    let member: Player;
    for (let pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
    }

    // Check if player exists
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    // make sure they dont ban themselves
    if (member === player) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You cannot ban yourself.`);
    }

    let tags = player.getTags();

    // this removes old ban stuff
    tags.forEach(t => {
        if(t.startsWith("Reason:")) {
            member.removeTag(t);
        }
        if(t.startsWith("By:")) {
            member.removeTag(t);
        }
    });

    try {
        member.addTag('Reason:' + reason);
        member.addTag('By:' + player.nameTag);
        member.addTag('isBanned');
    } catch (error) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r I was unable to ban that player! Error: ${error}`);
    }
    return sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has banned ${member.nameTag}§r. Reason: ${reason}`);
}
