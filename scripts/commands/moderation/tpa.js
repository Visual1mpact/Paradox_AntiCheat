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

    let currentDimension;
    // Save which dimension they were in
    if (member.dimension.id === "minecraft:overworld") {
        currentDimension = "overworld"
    }
    if (member.dimension.id === "minecraft:nether") {
        currentDimension = "nether"
    }
    if (member.dimension.id === "minecraft:the_end") {
        currentDimension = "the end"
    }

    // Let's teleport you to that player
    player.teleport(new Location(member.location.x, member.location.y, member.location.z), World.getDimension(currentDimension), 0, player.bodyRotation);

    // Let you know that you have been teleported
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You have been teleported to ${disabler(member.nameTag)}."}]}`)
}
