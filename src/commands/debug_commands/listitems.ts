import { ChatSendAfterEvent, ItemStack, Player } from "@minecraft/server";
import { MinecraftItemTypes } from "../../node_modules/@minecraft/vanilla-data/lib/index";
import config from "../../data/config.js";
import { getPrefix, sendMsgToPlayer } from "../../util.js";
import { EncryptionManager } from "../../classes/EncryptionManager";

function listItems(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.debug) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: listitems`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: listitems [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Prints every item in the game and their max stack.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}listitems`,
        `    ${prefix}listitems help`,
    ]);
}

/**
 * @name listitems
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function listitems(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/debug_commands/listitems.js:30)");
    }

    const player = message.sender;

    // Check for hash/salt and validate password
    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");

    // Use either the operator's ID or the encryption password as the key
    const key = config.encryption.password ? config.encryption.password : player.id;

    // Generate the hash
    const encode = EncryptionManager.hashWithSalt(salt as string, key);
    // Make sure the user has permissions to run the command
    if (!encode || hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.debug) {
        return listItems(player, prefix);
    }

    for (const item in MinecraftItemTypes) {
        const itemInfo = new ItemStack(MinecraftItemTypes[item as keyof typeof MinecraftItemTypes]);
        console.log("'" + itemInfo.typeId + "': " + itemInfo.maxAmount + ",");
    }
    sendMsgToPlayer(player, "§f§4[§6Paradox§4]§f List completed. Check console logs.");
}
