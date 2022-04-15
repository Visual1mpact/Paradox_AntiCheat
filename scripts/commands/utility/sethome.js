import { world } from "mojang-minecraft";
import { disabler } from "../../util.js";

const World = world;

/**
 * @name sethome
 * @param {object} message - Message object
 */
export function sethome(message) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/sethome.js:8)");
    }

    message.cancel = true;

    let player = message.sender;

    // Get current location
    let {x, y, z} = player.location;

    let homex = x.toFixed(0);
    let homey = y.toFixed(0);
    let homez = z.toFixed(0);
    player.getTags().forEach(tag => {
        if (tag.includes("HomeX:") || tag.includes("HomeY:") || tag.includes("HomeZ:")) {
            player.removeTag(tag);
        }
    })
    player.addTag(`HomeX:${homex}`);
    player.addTag(`HomeY:${homey}`);
    player.addTag(`HomeZ:${homez}`);
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"\nHome has been set at ${homex} ${homey} ${homez}!"}]}`)
}
