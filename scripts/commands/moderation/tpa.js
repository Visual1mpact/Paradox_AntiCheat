/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world, Location, BlockLocation } from "mojang-minecraft";
import { disabler } from "../../util.js";

const World = world;

/**
 * @name tpa
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided.
 */
export function tpa(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/tpa.js:10)");
    }
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? (./commands/moderation/tpa.js:11)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // Make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Was an arg passed?
    if (!args.length) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to provide a name for tpa!"}]}`);
    }
    
    // Try to find the player requested
    let member;
    if (args.length) {
        for (let pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
            }
        }
    }
    
    // Are they online?
    if (!member) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    // Save which dimension they were in
    // This will have to do until the property id for dimension is released
    // realm 0 = overworld, realm 1 = nether, realm 2 = the end
    let o = World.getDimension('overworld'),
        n = World.getDimension('nether'),
        e = World.getDimension('the end');
    let {x, y, z} = member.location;
    let pos = new BlockLocation(
        Math.floor(x),
        Math.floor(y),
        Math.floor(z)
    );
    let currentDimension;
    if (o.getEntitiesAtBlockLocation(pos).some(v => v.nameTag == disabler(member.nameTag))) {
        currentDimension = "overworld";
    } else if (n.getEntitiesAtBlockLocation(pos).some(v => v.nameTag == disabler(member.nameTag))) {
        currentDimension = "nether";
    } else if (e.getEntitiesAtBlockLocation(pos).some(v => v.nameTag == disabler(member.nameTag))) {
        currentDimension = "the end";
    }

    // Let's teleport you to that player
    player.teleport(new Location(member.location.x, member.location.y, member.location.z), World.getDimension(currentDimension), 0, player.bodyRotation);

    // Let you know that you have been teleported
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You have been teleported to ${disabler(member.nameTag)}."}]}`)
}
