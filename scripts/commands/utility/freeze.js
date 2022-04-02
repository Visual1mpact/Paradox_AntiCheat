/* eslint no-var: "off"*/
import { world, MinecraftEffectTypes } from "mojang-minecraft";
import { TickFreeze } from "../../penrose/tickevent/freeze/freeze.js";
import { disabler } from "../../util.js";

const World = world;

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
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (!args.length) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to provide which target to freeze!"}]}`);
    }
    
    // try to find the player requested
    let member;
    for (let pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
    }
    
    if (!member) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    if (member.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You cannot freeze Staff Members!"}]}`);
    }

    if (member.hasTag('freeze')) {
        member.runCommand(`tag "${disabler(member.nameTag)}" add nofreeze`);
    }
    if (member.hasTag('nofreeze')) {
        member.runCommand(`tag "${disabler(member.nameTag)}" remove freeze`);
    }
    if (member.hasTag('nofreeze')) {
        member.runCommand(`effect "${disabler(member.nameTag)}" clear`);
        member.runCommand(`tellraw "${disabler(member.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r You are no longer frozen!"}]}`);
        member.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ${disabler(member.nameTag)} is no longer frozen."}]}`);
    }

    if (!member.hasTag('nofreeze')) {
        // Blindness
        member.addEffect(MinecraftEffectTypes.blindness, 1000000, 255);
        // Mining Fatigue
        member.addEffect(MinecraftEffectTypes.miningFatigue, 1000000, 255);
        // Weakness
        member.addEffect(MinecraftEffectTypes.weakness, 1000000, 255);
        // Slowness
        member.addEffect(MinecraftEffectTypes.slowness, 1000000, 255);
    }

    if (!member.hasTag('nofreeze')) {
        member.runCommand(`tag "${disabler(member.nameTag)}" add freeze`);
        member.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r ${disabler(member.nameTag)} has been frozen"}]}`);
        return TickFreeze(member);
    }

    if (member.hasTag('nofreeze')) {
        member.runCommand(`tag "${disabler(member.nameTag)}" remove nofreeze`);
        return TickFreeze(member);
    }
}
