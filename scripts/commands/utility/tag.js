import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { disabler, tagRank, resetTag, getPrefix } from "../../util.js";

const World = world;

function tagHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.tag || !config.customcommands.chatranks) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    let moduleStatus;
    if (!config.modules.chatranks.enabled || !config.customcommands.chatranks) {
        moduleStatus = "§6[§4DISABLED§6]§r"
    } else {
        moduleStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: tag
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: tag <username> [optional]
§4[§6Optional§4]§r: Rank:tag, Rank:tag--tag, reset, help
§4[§6Description§4]§r: Gives one or more ranks to a specified player or resets it.
§4[§6Examples§4]§r:
    ${prefix}tag ${disabler(player.nameTag)} Rank:Admin
    ${prefix}tag ${disabler(player.nameTag)} Rank:Contributor--Mod
    ${prefix}tag ${disabler(player.nameTag)} Rank:Staff--Mod--Helper
    ${prefix}tag help
"}]}`)
}

/**
 * @name tag
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function tag(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./utility/tag.js:7)");
    }
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? (./utility/tag.js:8)");
    }

    message.cancel = true;

    let player = message.sender;

    // fixes a bug that kills !tag when using custom names
    player.nameTag = player.name;

    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.tag || !config.modules.chatranks.enabled || !config.customcommands.chatranks) {
        return tagHelp(player, prefix);
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

    // check if array contains the string 'reset'
    let argcheck = args.includes('reset');

    // reset rank
    if (argcheck === true) {
        resetTag(player, member);
        // tagRank(member);
        return;
    }

    let custom;
    args.forEach(t => {
        if(t.startsWith('Rank:')) {
            custom = t;
        }
    })
    if (custom.startsWith('Rank:')) {
        resetTag(player, member);
        member.addTag(`${custom}`);
        // tagRank(member);
    } else {
        return tagHelp(player, prefix);
    }

    if (disabler(player.nameTag) === disabler(member.nameTag)) {
        return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has changed their rank!"}]}`);
    }

    return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has changed the rank of ${member.name}!"}]}`);
}
