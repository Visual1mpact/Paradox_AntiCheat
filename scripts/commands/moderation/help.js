import { disabler } from "../../util.js";

/**
 * @name help
 * @param {object} message - Message object
 */
export function help(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/help.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    // if not then show them non staff commands
    if (!player.hasTag('paradoxOpped')) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§l§4Non-Staff Commands"}]}`)
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§6!report <username>§r - Report suspicious players to staff."}]}`);
    }

    return player.runCommand(`execute "${disabler(player.nameTag)}" ~~~ function help`);
}
