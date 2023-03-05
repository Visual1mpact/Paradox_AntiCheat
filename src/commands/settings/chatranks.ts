import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";

const World = world;

function chatRanksHelp(player: Player, prefix: string, chatRanksBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.chatranks) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (chatRanksBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: chatranks`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: chatranks [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles chat ranks.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}chatranks`,
        `    ${prefix}chatranks help`,
    ]);
}

/**
 * @name chatranks
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function chatranks(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/chatranks.js:35)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const chatRanksBoolean = dynamicPropertyRegistry.get("chatranks_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.chatranks) {
        return chatRanksHelp(player, prefix, chatRanksBoolean);
    }

    if (chatRanksBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("chatranks_b", true);
        World.setDynamicProperty("chatranks_b", true);
        /*
        for (let pl of world.getPlayers()) {
            const dimension = pl.dimension;
            Restore their custom nametag
            tagRank(pl);
            This refreshes the nameTag in the World for everyone online
            pl.teleport(pl.location, dimension, 0, 0);
        }
        */
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6ChatRanks§r!`);
    } else if (chatRanksBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("chatranks_b", false);
        World.setDynamicProperty("chatranks_b", false);
        /*
        for (let pl of world.getPlayers()) {
            const dimension = pl.dimension;
            Reset their nametag to its original name
            pl.nameTag = pl.name;
            This refreshes the nameTag in the World for everyone online
            pl.teleport(pl.location, dimension, 0, 0);
        }
        */
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4ChatRanks§r!`);
    }
}
