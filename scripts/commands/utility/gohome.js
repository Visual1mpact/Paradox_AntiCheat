import { world, Location } from "mojang-minecraft";
import { disabler } from "../../util.js";

const World = world;

/**
 * @name gohome
 * @param {object} message - Message object
 */
export function gohome(message) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/gohome.js:8)");
    }

    message.cancel = true;

    let player = message.sender;

    let homex;
    let homey;
    let homez;
    let dimension;
    player.getTags().forEach(tag => {
        if (tag.includes("HomeX:")) {
            homex = parseInt(tag.replace("HomeX:", ""));
        }
        if (tag.includes("HomeY:")) {
            homey = parseInt(tag.replace("HomeY:", ""));
        }
        if (tag.includes("HomeZ:")) {
            homez = parseInt(tag.replace("HomeZ:", ""));
        }
        if (tag.includes("Dimension:")) {
            dimension = tag.replace("Dimension:", "");
        }
    })

    if (!homex || !homey || !homez || !dimension) {
        player.runCommand(`tellraw @s {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You do not have a home point saved!"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"Welcome home ${disabler(player.nameTag)}!"}]}`);
        player.teleport(new Location(homex, homey, homez), World.getDimension(dimension), 0, player.bodyRotation);
    }
}
