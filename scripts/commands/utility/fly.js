/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import * as Minecraft from "mojang-minecraft";

const World = Minecraft.world;

/**
 * @name fly
 * @param {object} message - Message object
 * @param {array} args - (Optional) Additional arguments provided.
 */
export function fly(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/fly.js:9)");
    }
    // validate that required params are defined
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? (./commands/utility/fly.js:10)");
    }

    message.cancel = true;

    let player = message.sender;

    // make sure the user has permissions to run the command
    try {
        player.dimension.runCommand(`testfor @a[name="${player.nameTag}",tag=op]`);
    } catch (error) {
        return player.dimension.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }
    
    // try to find the player requested
    if(args.length) {
        for (let pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace("@", "").replace("\"", ""))) {
                var member = pl.name;
            }
        }
    }
    
    if (!member) {
        var member = player.nameTag;
    }

    player.dimension.runCommand(`execute "${member}" ~~~ function tools/fly`);
    
    // I find try/catch to be completely unorthodox for this lol
    try {
        player.dimension.runCommand(`testfor @a[name="${player.nameTag}",tag=flying]`);
        if (player.name === member) {
            return player.dimension.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${player.nameTag} has enabled fly mode for themselves."}]}`);
        } else if (player.name !== member) {
            return player.dimension.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${player.nameTag} has enabled fly mode for ${member}."}]}`);
        } else {
            return
        }
    } catch {
        if (player.name === member) {
            return player.dimension.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${player.nameTag} has disabled fly mode for themselves."}]}`);
        } else if (player.name !== member) {
            return player.dimension.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${player.nameTag} has disabled fly mode for ${member}."}]}`);
        } else {
            return
        }
    }
}
