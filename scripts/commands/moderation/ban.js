/* eslint no-var: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function banHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.ban) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: ban
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: ban [optional]
§4[§6Optional§4]§r: username, reason, help
§4[§6Description§4]§r: Bans the specified user and optionally gives a reason.
§4[§6Examples§4]§r:
    ${prefix}ban ${disabler(player.nameTag)}
    ${prefix}ban ${disabler(player.nameTag)} Hacker!
    ${prefix}ban ${disabler(player.nameTag)} Caught exploiting!
    ${prefix}ban help
"}]}`);
}

/**
 * @name ban
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function ban(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/ban.js:8)");
    }

    message.cancel = true;

    let player = message.sender;
    let reason = args.slice(1).join(" ") || "No reason specified";

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
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
    let member;
    for (let pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
    }

    // Check if player exists
    if (!member) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    // make sure they dont ban themselves
    if (disabler(member.nameTag) === disabler(player.nameTag)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You cannot ban yourself."}]}`);
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
        member.addTag('By:' + disabler(player.nameTag));
        member.addTag('isBanned');
    } catch (error) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"I was unable to ban that player! Error: ${error}"}]}`);
    }
    return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has banned ${disabler(member.nameTag)}. Reason: ${reason}"}]}`);
}
