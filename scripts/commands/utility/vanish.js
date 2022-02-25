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
    try {
        player.runCommand(`testfor @a[name="${player.nameTag}",tag=paradoxOpped]`);
    } catch (error) {
        return player.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (player.hasTag('vanish')) {
        player.addTag('novanish');
    }

    if (player.hasTag('novanish')) {
        player.removeTag('vanish');
    }

    if (player.hasTag('novanish')) {
        player.runCommand(`event entity "${player.nameTag}" unvanish`);
        player.runCommand(`effect "${player.nameTag}" clear`);
        player.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"\n§4[§6Paradox§4] §rYou are no longer in vanish!"}]}`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is no longer vanished."}]}`);
    }

    if (!player.hasTag('novanish')) {
        player.addTag('vanish');
    }

    if (player.hasTag('vanish') && !player.hasTag('novanish')) {
        player.runCommand(`event entity "${player.nameTag}" vanish`);
        player.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"\n§4[§6Paradox§4] §rYou are now in vanish!"}]}`);
        player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is now vanished."}]}`);
    }

    if (player.hasTag('novanish')) {
        player.removeTag('novanish');
    }
}
