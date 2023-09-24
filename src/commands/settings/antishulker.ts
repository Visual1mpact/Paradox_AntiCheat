import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { ChatSendAfterEvent, Player, Vector3, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";

function antishulkerHelp(player: Player, prefix: string, antiShulkerBoolean: string | number | boolean | Vector3) {
    let commandStatus: string;
    if (!config.customcommands.antishulker) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (antiShulkerBoolean) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: antishulker`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: antishulker [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Allows or denies shulker boxes in the world.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}antishulker`,
        `    ${prefix}antishulker help`,
    ]);
}

/**
 * @name antishulker
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function antishulker(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/antishulker.js:35)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const antiShulkerBoolean = dynamicPropertyRegistry.get("antishulker_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.antishulker) {
        return antishulkerHelp(player, prefix, antiShulkerBoolean);
    }

    if (antiShulkerBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("antishulker_b", true);
        world.setDynamicProperty("antishulker_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6Anti-Shulkers§f!`);
    } else if (antiShulkerBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("antishulker_b", false);
        world.setDynamicProperty("antishulker_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4Anti-Shulkers§f!`);
    }
}
