/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import * as Minecraft from "mojang-minecraft";
import { disabler } from "../../util.js";

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
        player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=paradoxOpped]`);
    } catch (error) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }
    
    // try to find the player requested
    if(args.length) {
        for (let pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace("@", "").replace("\"", ""))) {
                var member = pl;
            }
        }
    }
    
    if (!member) {
        var member = player;
    }

    player.runCommand(`execute "${disabler(member.nameTag)}" ~~~ function tools/fly`);
    
    // I find try/catch to be completely unorthodox for this lol
    try {
        player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=flying]`);
        if (disabler(player.nameTag) === disabler(member.nameTag)) {
            return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has enabled fly mode for themselves."}]}`);
        } else if (disabler(player.nameTag) !== disabler(member.nameTag)) {
            return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has enabled fly mode for ${disabler(member.nameTag)}."}]}`);
        } else {
            return;
        }
    } catch {
        if (disabler(player.nameTag) === disabler(member.nameTag)) {
            return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has disabled fly mode for themselves."}]}`);
        } else if (disabler(player.nameTag) !== disabler(member.nameTag)) {
            return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has disabled fly mode for ${disabler(member.nameTag)}."}]}`);
        } else {
            return;
        }
    }
}
