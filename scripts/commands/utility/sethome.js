import { world, BlockLocation } from "mojang-minecraft";
import { disabler } from "../../util.js";

const World = world;

/**
 * @name sethome
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided.
 */
export function sethome(message, args) {
    // Validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/sethome.js:8)");
    }
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? ./commands/utility/sethome.js:9)");
    }

    message.cancel = true;

    let player = message.sender;

    // Get current location
    let {x, y, z} = player.location;

    let homex = x.toFixed(0);
    let homey = y.toFixed(0);
    let homez = z.toFixed(0);
    let currentDimension;

    // Did they pass a parameter
    if (!args.length) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to give a name to your home!"}]}`);
    }

    // Make sure this name doesn't exist already
    let verify = false;
    let tags = player.getTags();
    for (let i = 0; i < tags.length; i++) {
        if (tags[i].startsWith(args[0].toString() + " X", 5)) {
            verify = true;
            player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You already have a home named ${args[0]}!"}]}`)
            break;
        }
    }
    if (verify === true) {
        return;
    }

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

    // Store their new home coordinates
    player.addTag(`Home:${args[0]} X:${homex} Y:${homey} Z:${homez} Dimension:${currentDimension}`);
    
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"${args[0]} has been set at ${homex} ${homey} ${homez}!"}]}`)
}
