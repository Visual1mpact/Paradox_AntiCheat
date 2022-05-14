/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { disabler, getPrefix, resetTag } from "../../util.js";

const World = world;

function testerHelp(player, prefix) {let commandStatus;
    if (!config.customcommands.tester) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: tester
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: tester [optional]
§4[§6Optional§4]§r: tester, help
§4[§6Description§4]§r: Adds and Removes player's as testers for the World to test Paradox.
§4[§6Examples§4]§r:
    ${prefix}tester ${disabler(player.nameTag)}
    ${prefix}tester help
"}]}`)
}

/**
 * @name tester
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function tester(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/tester.js:10)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.tester) {
        return testerHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return testerHelp(player, prefix);
    }
    
    // try to find the player requested
    let member;
    if (args.length) {
        for (let pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
            }
        }
    }
    
    if (!member) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Couldn't find that player!"}]}`);
    }

    // Check if the player is a tester or not
    // Add or remove tag based on return value
    if (!member.hasTag('TestPlayer')) {
        // Reset tag
        resetTag(player, member);
        // Use try/catch since nobody with notify enabled could return no target selector
        try {
            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(member.nameTag)} has been added as a Tester!"}]}`);
        } catch (error) {}
        player.runCommand(`tellraw "${disabler(member.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You have been added as a Tester!"}]}`);
        // New tag for tester
        member.addTag(`Rank:Tester`);
        // Make them a tester
        return member.addTag('TestPlayer');
    } else if (member.hasTag('TestPlayer')) {
        // Reset tag
        resetTag(player, member);
        // Use try/catch since nobody with notify enabled could return no target selector
        try {
            player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(member.nameTag)} has been removed as a Tester!"}]}`);
        } catch (error) {}
        player.runCommand(`tellraw "${disabler(member.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You have been removed as a Tester!"}]}`);
        // Check if they were banned during testing and remove it
        if (member.hasTag('isBanned')) {
            member.removeTag('isBanned');
        }
        // No longer a tester
        return member.removeTag('TestPlayer');
    }
}
