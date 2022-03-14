/* eslint no-var: "off"*/
import { world } from "mojang-minecraft";
import { disabler } from "../../util.js";

const World = world;

/**
 * @name ecwipe
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided.
 */
export function ecwipe(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/ecwipe.js:8)");
    }
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? (./commands/utility/ecwipe.js:9)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (!args.length) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to provide whos ender chest inventory to wipe!"}]}`);
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

    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 0 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 1 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 2 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 3 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 4 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 5 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 6 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 7 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 8 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 9 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 10 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 11 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 12 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 13 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 14 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 15 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 16 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 17 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 18 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 19 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 20 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 21 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 22 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 23 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 24 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 25 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 26 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 27 air`);
    player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 28 air`);
    return player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest 29 air`);
}
