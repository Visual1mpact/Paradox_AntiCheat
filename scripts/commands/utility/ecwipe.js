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

    // There are 30 slots ranging from 0 to 29
    for (let slot = 0; slot < 30; slot++ ) {
        try {
            player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest ${slot} air`);
        } catch (error) {}
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Enderchest for ${disabler(member.nameTag)} has been wiped!"}]}`);
}
