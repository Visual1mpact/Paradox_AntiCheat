import { crypto, disabler, getPrefix, tagRank } from "../../util.js";
import config from "../../data/config.js";
import { world, Location } from "mojang-minecraft";

function chatRanksHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.chatranks) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    let moduleStatus;
    if (!config.modules.chatranks.enabled) {
        moduleStatus = "§6[§4DISABLED§6]§r"
    } else {
        moduleStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: chatranks
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: chatranks [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Toggles chat ranks.
§4[§6Examples§4]§r:
    ${prefix}chatranks
    ${prefix}chatranks help
"}]}`)
}

/**
 * @name chatranks
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function chatranks(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/chatranks.js:7)");
    }

    message.cancel = true;

    let player = message.sender;

    let tag = player.getTags();
    
    // make sure the user has permissions to run the command
    if (!tag.includes(crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.chatranks) {
        return chatRanksHelp(player, prefix);
    }

    if (config.modules.chatranks.enabled === false) {
        // Allow
        config.modules.chatranks.enabled = true;
        for (let pl of world.getPlayers()) {
            const dimension = pl.dimension;
            // Restore their custom nametag
            // tagRank(pl);
            // This refreshes the nameTag in the World for everyone online
            // pl.teleport(new Location(pl.location.x, pl.location.y, pl.location.z), dimension, 0, pl.bodyRotation);
        }
        player.runCommand(`tellraw @a[tag=${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has enabled §6ChatRanks§r!"}]}`);
        return;
    } else if (config.modules.chatranks.enabled === true) {
        // Deny
        config.modules.chatranks.enabled = false;
        for (let pl of world.getPlayers()) {
            const dimension = pl.dimension;
            // Reset their nametag to its original name
            // pl.nameTag = pl.name;
            // This refreshes the nameTag in the World for everyone online
            // pl.teleport(new Location(pl.location.x, pl.location.y, pl.location.z), dimension, 0, pl.bodyRotation);
        }
        player.runCommand(`tellraw @a[tag=${crypto}] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled §4ChatRanks§r!"}]}`);
        return;
    }
}
