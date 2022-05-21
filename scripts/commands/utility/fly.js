/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function flyHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.fly) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: fly
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: fly [optional]
§4[§6Optional§4]§r: username, help
§4[§6Description§4]§r: Will grant player the ability to fly.
§4[§6Examples§4]§r:
    ${prefix}fly ${disabler(player.nameTag)}
    ${prefix}fly help
"}]}`)
}

function mayflydisable(player, member) {
    if (disabler(player.nameTag) === disabler(member.nameTag)) {
        member.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has disabled fly mode for themselves."}]}`);
    } else if (disabler(player.nameTag) !== disabler(member.nameTag)) {
        member.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has disabled fly mode for ${disabler(member.nameTag)}."}]}`);
    }
}

function mayflyenable(player, member) {
    if (disabler(player.nameTag) === disabler(member.nameTag)) {
        return member.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has enabled fly mode for themselves."}]}`);
    } else if (disabler(player.nameTag) !== disabler(member.nameTag)) {
        return member.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has enabled fly mode for ${disabler(member.nameTag)}."}]}`);
    }
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
    let playertag = player.getTags();

    // make sure the user has permissions to run the command
    if (!playertag.includes(crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
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
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    let membertag = member.getTags();

    if (!membertag.includes('noflying') && !membertag.includes('flying')) {
        member.runCommand(`ability "${disabler(member.nameTag)}" mayfly true`);
        member.addTag('flying');
        mayflyenable(player, member);
        return;
    }

    if (membertag.includes('flying')) {
        member.addTag('noflying');
    }

    if (member.hasTag('noflying')) {
        member.removeTag('flying');
        member.runCommand(`ability "${disabler(member.nameTag)}" mayfly false`);
        mayflydisable(player, member);
        member.removeTag('noflying');
        return;
    }
}
