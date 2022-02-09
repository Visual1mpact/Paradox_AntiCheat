/* eslint no-var: "off"*/
import * as Minecraft from "mojang-minecraft";

const World = Minecraft.world;

/**
 * @name ban
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided.
 */
export function ban(message, args) {
    // validate that required params are defined
    if (!message) return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/ban.js:9)");
    if (!args) return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? (./commands/moderation/ban.js:10)");

    message.cancel = true;

    let player = message.sender;
    let reason = args.slice(1).join(" ") || "No reason specified";

    // make sure the user has permissions to run the command
    try {
        player.dimension.runCommand(`testfor @a[name="${player.nameTag}",tag=op]`);
    } catch (error) {
        return player.dimension.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (!args.length) return player.dimension.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to provide who to ban!"}]}`);
    
    // try to find the player requested
    for (let pl of World.getPlayers()) if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace("@", "").replace("\"", ""))) var member = pl.nameTag; 

    if (!member) return player.dimension.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);

    // make sure they dont ban themselves
    if (member === player.nameTag) return player.dimension.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You cannot ban yourself."}]}`);

    let tags = player.dimension.runCommand(`tag "${member}" list`, player.dimension).statusMessage.replace(/§./g, '').match(/(?<=: ).*$/g);
    if (tags) tags = String(tags).split(/[,]/);

    // this removes old ban stuff
    tags.forEach(t => {
        if(t.startsWith(" reason:")) player.dimension.runCommand(`tag "${member}" remove "${t.slice(1)}"`);
        if(t.startsWith(" by:")) player.dimension.runCommand(`tag "${member}" remove "${t.slice(1)}"`);
    });

    try {
        player.dimension.runCommand(`tag "${member}" add "reason:${reason}"`);
        player.dimension.runCommand(`tag "${member}" add "by:${player.nameTag}"`);
        player.dimension.runCommand(`tag "${member}" add isBanned`);
    } catch (error) {
        console.warn(`${new Date()} | ` + error);
        return player.dimension.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"I was unable to ban that player! Error: ${error}"}]}`);
    }
    return player.dimension.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${player.nameTag} has banned ${member}. Reason: ${reason}"}]}`);
}
