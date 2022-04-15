import { world, BlockLocation } from "mojang-minecraft";
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
    let currentDimension;
    player.getTags().forEach(tag => {
        if (tag.includes("HomeX:") || tag.includes("HomeY:") || tag.includes("HomeZ:") || tag.includes("Dimension:")) {
            player.removeTag(tag);
        }
    })

    // Save which dimension they were in
    // This will have to do until the property id for dimension is released
    // realm 0 = overworld, realm 1 = nether, realm 2 = the end
    let o = World.getDimension('overworld'),
        n = World.getDimension('nether'),
        e = World.getDimension('the end');
    let pos = new BlockLocation(
        Math.floor(x),
        Math.floor(y),
        Math.floor(z)
    );
    if (o.getEntitiesAtBlockLocation(pos).some(v => v.nameTag == disabler(player.nameTag))) {
        currentDimension = "overworld";
    } else if (n.getEntitiesAtBlockLocation(pos).some(v => v.nameTag == disabler(player.nameTag))) {
        currentDimension = "nether";
    } else if (e.getEntitiesAtBlockLocation(pos).some(v => v.nameTag == disabler(player.nameTag))) {
        currentDimension = "the end";
    }

    player.addTag(`HomeX:${homex}`);
    player.addTag(`HomeY:${homey}`);
    player.addTag(`HomeZ:${homez}`);
    player.addTag(`Dimension:${currentDimension}`);
    
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"Home has been set at ${homex} ${homey} ${homez}!"}]}`)
}
