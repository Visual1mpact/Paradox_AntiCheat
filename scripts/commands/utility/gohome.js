import { world, Location } from "mojang-minecraft";
import { disabler } from "../../util.js";

const World = world;

/**
 * @name gohome
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided.
 */
export function gohome(message, args) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/gohome.js:8)");
    }
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? ./commands/utility/gohome.js:9)");
    }

    message.cancel = true;

    let player = message.sender;

    // Did they pass a parameter
    if (!args.length) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You need to give a name to your home!"}]}`);
    }

    // Don't allow spaces
    if (args.length > 1) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"No spaces in names please!"}]}`);
    }

    let homex;
    let homey;
    let homez;
    let dimension;
    let coordinatesArray;
    let tags = player.getTags();
    for (let i = 0; i < tags.length; i++) {
        if (tags[i].startsWith(args[0].toString() + " X", 13)) {
            // Split string into array
            coordinatesArray = tags[i].split(' ');
            break;
        }
    }

    for (let i = 0; i < coordinatesArray.length; i++) {
        // Get their location from the array
        if (coordinatesArray[i].includes("X:")) {
            homex = parseInt(coordinatesArray[i].replace("X:", ""));
        }
        if (coordinatesArray[i].includes("Y:")) {
            homey = parseInt(coordinatesArray[i].replace("Y:", ""));
        }
        if (coordinatesArray[i].includes("Z:")) {
            homez = parseInt(coordinatesArray[i].replace("Z:", ""));
        }
        if (coordinatesArray[i].includes("Dimension:")) {
            dimension = coordinatesArray[i].replace("Dimension:", "");
        }
    }

    if (!homex || !homey || !homez || !dimension) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"${args[0]} does not exist!"}]}`);
    } else {
        player.runCommand(`scoreboard players set "${disabler(player.nameTag)}" teleport 25`);
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"Welcome back ${disabler(player.nameTag)}!"}]}`);
        player.teleport(new Location(homex, homey, homez), World.getDimension(dimension), 0, player.bodyRotation);
    }
}
