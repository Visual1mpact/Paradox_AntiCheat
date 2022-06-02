/* eslint no-var: "off"*/
import { world, MinecraftEffectTypes } from "mojang-minecraft";
import config from "../../data/config.js";
import { TickFreeze } from "../../penrose/tickevent/freeze/freeze.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function freezeHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.freeze) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: freeze
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: freeze [optional]
§4[§6Optional§4]§r: username, help
§4[§6Description§4]§r: Will freeze or unfreeze the specified player.
§4[§6Examples§4]§r:
    ${prefix}freeze ${disabler(player.nameTag)}
    ${prefix}freeze help
"}]}`);
}

/**
 * @name freeze
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function freeze(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/freeze.js:8)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.freeze) {
        return freezeHelp(player, prefix);
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

    if (member.hasTag('Hash:' + crypto)) {
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
        member.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ${disabler(member.nameTag)} is no longer frozen."}]}`);
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
        member.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r ${disabler(member.nameTag)} has been frozen"}]}`);
        return TickFreeze(member);
    }

    if (member.hasTag('nofreeze')) {
        member.runCommand(`tag "${disabler(member.nameTag)}" remove nofreeze`);
        return TickFreeze(member);
    }
}
