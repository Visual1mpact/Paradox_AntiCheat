import { world, Location } from "mojang-minecraft";
import config from "../../data/config.js";
import { disabler, getPrefix } from "../../util.js";

const World = world;

function goHomeHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.gohome) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: gohome
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: gohome <name> [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Return home to a specified saved location.
§4[§6Examples§4]§r:
    ${prefix}gohome barn
    ${prefix}gohome help
"}]}`)
}

/**
 * @name gohome
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function gohome(message, args) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/gohome.js:8)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.gohome) {
        return goHomeHelp(player, prefix);
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
