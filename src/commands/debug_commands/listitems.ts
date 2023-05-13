/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { BeforeChatEvent, ItemStack, MinecraftItemTypes, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";

function listItems(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.debug) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: listitems`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: listitems [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Prints every item in the game and their max stack.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}listitems`,
        `    ${prefix}listitems help`,
    ]);
}

/**
 * @name listitems
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function listitems(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/debug_commands/listitems.js:30)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    const encode = crypto?.(salt, config?.modules?.encryption?.password);
    // Make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.debug) {
        return listItems(player, prefix);
    }

    for (const item in MinecraftItemTypes) {
        let itemInfo = new ItemStack(MinecraftItemTypes[item as keyof typeof MinecraftItemTypes] as string);
        itemInfo.amount = 255;
        console.log("'" + itemInfo.typeId + "': " + itemInfo.amount + ",");
    }
    sendMsgToPlayer(player, "§r§4[§6Paradox§4]§r List completed. Check console logs.");
}
