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
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/moderation/ban.js:8)");
    }
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? (./commands/moderation/ban.js:9)");
    }

    message.cancel = true;

    let player = message.sender;
    let reason = args.slice(1).join(" ") || "No reason specified";

    // make sure the user has permissions to run the command
    try {
        player.runCommand(`testfor @a[name="${player.nameTag}",tag=paradoxOpped]`);
    } catch (error) {
        return player.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (!args.length) {
        return player.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to provide who to ban!"}]}`);
    }
    
    // try to find the player requested
    for (let pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace("@", "").replace("\"", ""))) {
            var member = pl;
        }
    }

    if (!member) {
        return player.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    // make sure they dont ban themselves
    if (member.nameTag === player.nameTag) {
        return player.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You cannot ban yourself."}]}`);
    }

    let tags = player.getTags();

    // this removes old ban stuff
    tags.forEach(t => {
        if(t.startsWith("Reason:")) {
            member.removeTag(t.slice(1));
        }
        if(t.startsWith("By:")) {
            member.removeTag(t.slice(1));
        }
    });

    try {
        player.runCommand(`tag "${member.nameTag}" add "Reason:${reason}"`);
        player.runCommand(`tag "${member.nameTag}" add "By:${player.nameTag}"`);
        member.addTag('isBanned');
    } catch (error) {
        console.warn(`${new Date()} | ` + error);
        return player.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"I was unable to ban that player! Error: ${error}"}]}`);
    }
    return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${player.nameTag} has banned ${member.nameTag}. Reason: ${reason}"}]}`);
}
