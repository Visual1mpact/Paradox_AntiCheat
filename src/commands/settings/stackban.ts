import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";

const World = world;

function stackBanHelp(player: Player, prefix: string, stackBanBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.stackban) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (stackBanBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: stackban`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: stackban [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for player's with illegal stacks over 64.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}stackban`,
        `    ${prefix}stackban help`,
    ]);
}

/**
 * @name stackban
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function stackban(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/stackban.js:35)");
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
    const stackBanBoolean = dynamicPropertyRegistry.get("stackban_b");
    const illegalItemsABoolean = dynamicPropertyRegistry.get("illegalitemsa_b");
    const illegalItemsBBoolean = dynamicPropertyRegistry.get("illegalitemsb_b");
    const illegalItemsCBoolean = dynamicPropertyRegistry.get("illegalitemsc_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.stackban) {
        return stackBanHelp(player, prefix, stackBanBoolean);
    }

    if (!illegalItemsABoolean && !illegalItemsBBoolean && !illegalItemsCBoolean) {
        if (stackBanBoolean) {
            // In this stage they are likely turning it off so oblige their request
            dynamicPropertyRegistry.set("stackban_b", false);
            return World.setDynamicProperty("stackban_b", false);
        }
        // If illegal items are not enabled then let user know this feature is inaccessible
        // It will not work without one of them
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to enable Illegal Items to use this feature.`);
    }

    if (stackBanBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("stackban_b", true);
        World.setDynamicProperty("stackban_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6StackBans§r!`);
    } else if (stackBanBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("stackban_b", false);
        World.setDynamicProperty("stackban_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4StackBans§r!`);
    }
}
