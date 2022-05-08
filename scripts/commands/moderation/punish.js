/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world, ItemStack, MinecraftItemTypes } from "mojang-minecraft";
import config from "../../data/config.js";
import { disabler, getPrefix } from "../../util.js";

const World = world;

function punishHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.punish) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: punish
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: punish <username> [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Removes all items from the player's inventory and ender chest.
§4[§6Examples§4]§r:
    ${prefix}punish ${disabler(player.nameTag)}
    ${prefix}punish help
"}]}`)
}

/**
 * @name punish
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function punish(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/punish.js:10)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // Make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.punish) {
        return punishHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return punishHelp(player, prefix);
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
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    // Make sure they don't punish themselves
    if (disabler(member.nameTag) === disabler(player.nameTag)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You cannot punish yourself."}]}`);
    }

    // There are 30 slots ranging from 0 to 29
    // Let's clear out that ender chest
    for (let slot = 0; slot < 30; slot++) {
        try {
            player.runCommand(`replaceitem entity "${disabler(member.nameTag)}" slot.enderchest ${slot} air`);
        } catch (error) {}
    }

    // Get requested player's inventory so we can wipe it out
    let inventory = member.getComponent('minecraft:inventory').container;
    for (let i = 0; i < inventory.size; i++) {
        let inventory_item = inventory.getItem(i);
        if (!inventory_item) {
            continue;
        }
        try {
            inventory.setItem(i, new ItemStack(MinecraftItemTypes.air, 1));
        } catch {}
    }
    // Notify staff and player that punishment has taken place
    player.runCommand(`tellraw "${disabler(member.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You have been punished for your behavior!"}]}`);
    // Use try/catch in case nobody has tag 'notify' as this will report 'no target selector'
    try {
        return player.runCommand(`tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"${disabler(player.nameTag)} has punished ${disabler(member.nameTag)}!"}]}`);
    } catch (error) {
        return;
    }
}
