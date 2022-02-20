/* eslint no-var: "off"*/
import * as Minecraft from "mojang-minecraft";
import { TickFreeze } from "../../penrose/tickevent/freeze/freeze.js";

const World = Minecraft.world;

/**
 * @name freeze
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided.
 */
export function freeze(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/freeze.js:8)");
    }
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? (./commands/utility/freeze.js:9)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    try {
        player.runCommand(`testfor @a[name="${player.nameTag}",tag=op]`);
    } catch (error) {
        return player.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (!args.length) {
        return player.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to provide which target to freeze!"}]}`);
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

    if (member.hasTag('freeze')) {
        member.runCommand(`tag "${member.nameTag}" add nofreeze`);
    }
    if (member.hasTag('nofreeze')) {
        member.runCommand(`tag "${member.nameTag}" remove freeze`);
    }
    if (member.hasTag('nofreeze')) {
        member.runCommand(`effect "${member.nameTag}" clear`);
        member.runCommand(`tellraw "${member.nameTag}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r You are no longer frozen!"}]}`);
        member.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ${member.nameTag} is no longer frozen."}]}`);
    }

    if (!member.hasTag('nofreeze')) {
        // Blindness
        member.addEffect(Minecraft.MinecraftEffectTypes.blindness, 1000000, 255);
        // Mining Fatigue
        member.addEffect(Minecraft.MinecraftEffectTypes.miningFatigue, 1000000, 255);
        // Weakness
        member.addEffect(Minecraft.MinecraftEffectTypes.weakness, 1000000, 255);
        // Slowness
        member.addEffect(Minecraft.MinecraftEffectTypes.slowness, 1000000, 255);
    }

    if (!member.hasTag('nofreeze')) {
        member.runCommand(`tag "${member.nameTag}" add freeze`);
        member.runCommand(`tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r ${member.nameTag} has been frozen"}]}`);
        return TickFreeze(member);
    }

    if (member.hasTag('nofreeze')) {
        member.runCommand(`tag "${member.nameTag}" remove nofreeze`);
        return TickFreeze(member);
    }
}
