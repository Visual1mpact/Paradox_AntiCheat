/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import * as Minecraft from "mojang-minecraft";
import { disabler } from "../../util.js";
import config from "../../data/config.js";

const World = Minecraft.world;

function resetPrefix(player) {
    let sanitize = player.getTags();
    for (let tag of sanitize) {
        if (tag.startsWith('Prefix:')) {
            player.removeTag(tag);
            config.customcommands.prefix = "!";
        }
    }
    return player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has reset their prefix!"}]}`);
}

/**
 * @name prefix
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided.
 */
export function prefix(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/prefix.js:9)");
    }
    if (!args) {
        return console.warn(`${new Date()} | ` + "Error: ${args} isnt defined. Did you forget to pass it? (./commands/moderation/prefix.js:10)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // check if array contains the string 'reset'
    let argcheck = args.includes('reset');

    // reset prefix
    if (argcheck === true) {
        resetPrefix(player);
        return;
    }

    // Change Prefix command under conditions
    if (args[0].length <= 2 && args[0].length >=1) {
        resetPrefix(player);
        config.customcommands.prefix = args[0];
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has changed their Prefix to ${args[0]}"}]}`);
        return player.addTag('Prefix:' + args[0]);
    } else {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to limit the Prefix to 2 characters or less!"}]}`);
    }
}
