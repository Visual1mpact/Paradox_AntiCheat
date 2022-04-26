import { world } from "mojang-minecraft";
import { disabler } from "../../util.js";

const World = world;

/**
 * @name delhome
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided.
 */
export function delhome(message, args) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/delhome.js:8)");
    }
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? ./commands/utility/delhome.js:9)");
    }

    message.cancel = true;

    let player = message.sender;

    // Did they pass a parameter
    if (!args.length) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to specify which home to delete!"}]}`);
    }

    // Find and delete this saved home location
    let verify = false;
    let tags = player.getTags();
    for (let i = 0; i < tags.length; i++) {
        if (tags[i].startsWith(args[0].toString() + " X", 13)) {
            verify = true;
            player.removeTag(tags[1])
            player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You have successfully deleted ${args[0]}!"}]}`)
            break;
        }
    }
    if (verify === true) {
        return;
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"${args[0]} does not exist!"}]}`)
    }
}
