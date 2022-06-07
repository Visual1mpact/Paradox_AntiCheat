import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

function vanishHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.vanish) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: vanish
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: vanish [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Turns the player invisible to monitor online player's.
§4[§6Examples§4]§r:
    ${prefix}vanish
    ${prefix}vanish help
"}]}`);
}

/**
 * @name vanish
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function vanish(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./utility/vanish.js:7)");
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
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.vanish) {
        return vanishHelp(player, prefix);
    }

    if (player.hasTag('vanish')) {
        player.addTag('novanish');
    }

    if (player.hasTag('novanish')) {
        player.removeTag('vanish');
    }

    if (player.hasTag('novanish')) {
        player.runCommand(`event entity "${disabler(player.nameTag)}" unvanish`);
        player.runCommand(`effect "${disabler(player.nameTag)}" clear`);
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§4[§6Paradox§4] §rYou are no longer in vanish!"}]}`);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is no longer vanished."}]}`);
    }

    if (!player.hasTag('novanish')) {
        player.addTag('vanish');
    }

    if (player.hasTag('vanish') && !player.hasTag('novanish')) {
        player.runCommand(`event entity "${disabler(player.nameTag)}" vanish`);
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§4[§6Paradox§4] §rYou are now in vanish!"}]}`);
        player.runCommand(`tellraw @a[tag=Hash:${crypto}] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is now vanished."}]}`);
    }

    if (player.hasTag('novanish')) {
        player.removeTag('novanish');
    }
}
