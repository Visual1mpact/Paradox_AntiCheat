import { disabler } from "../../util.js";

/**
 * @name notify
 * @param {object} message - Message object
 */
export function notify(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/notify.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    try {
        player.runCommand(`testfor @a[name="${disabler(player.nameTag)}",tag=paradoxOpped]`);
    } catch (error) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (player.hasTag('notify')) {
        player.addTag('nonotify');
    }

    if (player.hasTag('nonotify')) {
        player.removeTag('notify');
    }

    if (player.hasTag('nonotify')) {
        player.runCommand(`tellraw @s {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r You have disabled cheat notifications."}]}`);
    }

    if (!player.hasTag('nonotify')) {
        player.addTag('notify');
    }

    if (player.hasTag('notify') && !player.hasTag('nonotify')) {
        player.runCommand('tellraw @s {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r You have enabled cheat notifications."}]}');
    }

    if (player.hasTag('nonotify')) {
        player.removeTag('nonotify');
    }
}
