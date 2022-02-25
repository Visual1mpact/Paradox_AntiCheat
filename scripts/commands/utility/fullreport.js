/* eslint no-var: "off"*/

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
    try {
        player.runCommand(`testfor @a[name="${player.nameTag}",tag=paradoxOpped]`);
    } catch (error) {
        return player.runCommand(`tellraw "${player.nameTag}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    return player.runCommand(`execute @a ~~~ function tools/stats`);
}
