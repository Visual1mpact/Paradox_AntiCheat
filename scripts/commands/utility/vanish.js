import { disabler } from "../../util.js";

/**
 * @name vanish
 * @param {object} message - Message object
 */
export function vanish(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./utility/vanish.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (player.hasTag('vanish')) {
        player.addTag('novanish');
    }

    if (player.hasTag('novanish')) {
        player.removeTag('vanish');
    }

    if (player.hasTag('novanish')) {
        player.runCommand(`event entity ${disabler(player.nameTag)} unvanish`);
        player.runCommand(`effect ${disabler(player.nameTag)} clear`);
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§4[§6Paradox§4] §rYou are no longer in vanish!"}]}`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is no longer vanished."}]}`);
    }

    if (!player.hasTag('novanish')) {
        player.addTag('vanish');
    }

    if (player.hasTag('vanish') && !player.hasTag('novanish')) {
        player.runCommand(`event entity ${disabler(player.nameTag)} vanish`);
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§4[§6Paradox§4] §rYou are now in vanish!"}]}`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is now vanished."}]}`);
    }

    if (player.hasTag('novanish')) {
        player.removeTag('novanish');
    }
}
