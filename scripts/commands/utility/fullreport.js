/* eslint no-var: "off"*/

import { disabler, getScore } from "../../util.js";

/**
 * @name fullreport
 * @param {object} message - Message object
 */
export function fullreport(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/fullreport.js:8)");
    }
    
    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    if (!player.hasTag('notify')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to enable cheat notifications."}]}`);
    }

    return player.runCommand(`execute @a ~~~ function tools/stats`);
}
