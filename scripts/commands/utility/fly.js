/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import * as Minecraft from "mojang-minecraft";
import { disabler } from "../../util.js";

const World = Minecraft.world;

function mayflydisable(player, member) {
    if (disabler(player.nameTag) === disabler(member.nameTag)) {
        member.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has disabled fly mode for themselves."}]}`);
    } else if (disabler(player.nameTag) !== disabler(member.nameTag)) {
        member.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has disabled fly mode for ${disabler(member.nameTag)}."}]}`);
    }
}

function mayflyenable(player, member) {
    if (disabler(player.nameTag) === disabler(member.nameTag)) {
        return member.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has enabled fly mode for themselves."}]}`);
    } else if (disabler(player.nameTag) !== disabler(member.nameTag)) {
        return member.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has enabled fly mode for ${disabler(member.nameTag)}."}]}`);
    }
}

/**
 * @name fly
 * @param {object} message - Message object
 * @param {array} args - (Optional) Additional arguments provided.
 */
export function fly(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/fly.js:9)");
    }
    // validate that required params are defined
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? (./commands/utility/fly.js:10)");
    }

    message.cancel = true;

    let player = message.sender;
    let playertag = player.getTags();

    // make sure the user has permissions to run the command
    if (!playertag.includes('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }
    
    // try to find the player requested
    let member;
    if(args.length) {
        for (let pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace("@", "").replace("\"", ""))) {
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
