/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world, Location } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function tpaHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.antinukera) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: tpa
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: tpa [optional]
§4[§6Optional§4]§r: username, help
§4[§6Description§4]§r: Teleport to another player.
§4[§6Examples§4]§r:
    ${prefix}tpa ${disabler(player.nameTag)}
    ${prefix}tpa help
"}]}`)
}

/**
 * @name tpa
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function tpa(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/tpa.js:10)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // Make sure the user has permissions to run the command
    if (!player.hasTag('Hash:' + crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.tpa) {
        return tpaHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return tpaHelp(player, prefix);
    }
    
    // Try to find the player requested
    let member;
    if (args.length) {
        for (let pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
            }
        }
    }
    
    // Are they online?
    if (!member) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    let currentDimension;
    // Save which dimension they were in
    if (member.dimension.id === "minecraft:overworld") {
        currentDimension = "overworld"
    }
    if (member.dimension.id === "minecraft:nether") {
        currentDimension = "nether"
    }
    if (member.dimension.id === "minecraft:the_end") {
        currentDimension = "the end"
    }

    // Let's teleport you to that player
    player.teleport(new Location(member.location.x, member.location.y, member.location.z), World.getDimension(currentDimension), 0, player.bodyRotation);

    // Let you know that you have been teleported
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You have been teleported to ${disabler(member.nameTag)}."}]}`)
}
