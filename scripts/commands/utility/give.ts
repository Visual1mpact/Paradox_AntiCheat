/* eslint no-var: "off"*/

import { BeforeChatEvent, EntityInventoryComponent, Player, world } from "mojang-minecraft";
import { ItemStack } from "mojang-minecraft";
import { MinecraftItemTypes } from "mojang-minecraft";
import config from "../../data/config.js";
import maxItemStack, { defaultMaxItemStack } from "../../data/maxstack.js";
import { crypto, getPrefix, sendMsgToPlayer, toCamelCase } from "../../util.js";

const World = world;

function giveHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.fullreport) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: give`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: give [optional]`,
        `§4[§6Optional§4]§r: username item amount data, help`,
        `§4[§6Description§4]§r: Gives player items.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}give ${player.name} diamond 64`,
        `    ${prefix}give ${player.name} iron_ore 64`,
        `    ${prefix}give ${player.name} tropical_fish 64`,
        `    ${prefix}give ${player.name} log2 64 1`,
        `    ${prefix}give help`,
    ]);
}

/**
 * @name give
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function give(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/give.js:36)");
    }
    
    message.cancel = true;

    let player = message.sender;
    
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.give) {
        return giveHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return giveHelp(player, prefix);
    }
    
    // Try to find the player requested
    let member: Player;
    if (args.length) {
        for (let pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
            }
        }
    }
    
    // Are they online?
    if (!member) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r Couldnt find that player!`);
    }

    /**
     * Verify if the parameters are valid to prevent errors
     * args[0] = username
     * args[1] = item
     * args[2] = amount
     * args[3] = data (optional)
     */
    let confirmItem = false;
    let itemStringConvert = toCamelCase(args[1]);
    for (let itemValidate in MinecraftItemTypes) {
        if (itemStringConvert === itemValidate) {
            confirmItem = true;
            break;
        }
    }
    if (confirmItem) {
        if (isNaN(Number(args[2]))) {
            /**
             * This parameter is invalid so we will remove it and add a default value of 1.
             */
            args.splice(2, 1, '1');
        }
        if (isNaN(Number(args[3]))) {
            /**
             * This parameter is invalid
             */
             args.splice(3, 1, '0');
        }
        const maxStack = maxItemStack[itemStringConvert.replace(itemStringConvert, "minecraft:" + args[1])] ?? defaultMaxItemStack;
        if (maxStack >= args[2]) {
            let invContainer = member.getComponent('inventory') as EntityInventoryComponent;
            let inv = invContainer.container;
            let item = new ItemStack(MinecraftItemTypes[itemStringConvert], Number(args[2]), Number(args[3]));
            inv.addItem(item);
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r ${member.name} was given ${args[1]} x${args[2]}.`);
        } else {
            return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r This stack is too high! ${maxStack} is the max. Try again.`);
        }
    } else {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r This item could not be found! Try again.`);
    }
}
