/* eslint no-var: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, getPrefix } from "../../util.js";

const World = world;

function invseeHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.invsee) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: invsee
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: invsee [optional]
§4[§6Optional§4]§r: username, help
§4[§6Description§4]§r: Shows the entire inventory of the specified player.
§4[§6Examples§4]§r:
    ${prefix}invsee ${disabler(player.nameTag)}
    ${prefix}invsee help
"}]}`)
}

// found the inventory viewing scipt in the bedrock addons discord, unsure of the original owner (not my code)
/**
 * @name invsee
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function invsee(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? ./commands/utility/invsee.js:9)");
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
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.invsee) {
        return invseeHelp(player, prefix);
    }
    
    // try to find the player requested
    let member;
    for (let pl of World.getPlayers()) {
        if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
            member = pl;
        }
    }
    
    if (!member) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    let container = member.getComponent('inventory').container;
    
    player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"${disabler(member.nameTag)}'s inventory:\n\n"}]}`);
    for (let i = 0; i < container.size; i++) {
        if (container.getItem(i)) {
            let o = container.getItem(i);
            player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"§fSlot ${i}§r §6=>§r §4[§f${o.id.replace("minecraft:", "")}§4]§r §6Amount: §4x${o.amount}§r §6=>§r §4[§fData ${o.data}§4]§r"}]}`);
        }
    }
}
