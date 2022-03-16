import { world } from "mojang-minecraft";
import { disabler, tagRank, resetTag } from "../../util.js";

const World = world;

/**
 * @name tag
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided.
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

    if (!args.length) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to provide a target and rank!"}]}`);
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Example: !tag ${player.name} Rank:Admin--VIP--Helper"}]}`);
    }

    // try to find the player requested
    let member;
    for (let pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace("@", "").replace("\"", ""))) {
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
        tagRank(member);
        return;
    }

    if (args[0] === member.name && args[1]) {
        if (args[1].startsWith('Rank:')) {
            resetTag(player, member);
            player.runCommand(`tag "${disabler(member.nameTag)}" add ${args[1]}`);
            tagRank(member);
        } else {
            player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to provide a target and rank!"}]}`);
            return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Example: !tag ${member.name} Rank:Admin--VIP--Helper"}]}`);
        }
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to provide a target and rank!"}]}`);
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Example: !tag ${member.name} Rank:Admin--VIP--Helper"}]}`);
    }

    if (disabler(player.nameTag) === disabler(member.nameTag)) {
        return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has changed their rank!"}]}`);
    }

    return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has changed the rank of ${member.name}!"}]}`);
}
