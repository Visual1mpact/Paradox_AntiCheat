import { ChatSendAfterEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

function vanishHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.vanish) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: vanish`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: vanish [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Turns the player invisible to monitor online player's.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}vanish`,
        `    ${prefix}vanish help`,
    ]);
}

/**
 * @name vanish
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function vanish(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./utility/vanish.js:26)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.vanish) {
        return vanishHelp(player, prefix);
    }

    const vanishBoolean = player.hasTag("vanish");

    if (vanishBoolean) {
        player.removeTag("vanish");
        player.triggerEvent("unvanish");
        player.runCommandAsync(`effect @s clear`);
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You are no longer vanished.`);
        sendMsg(`@a[tag=paradoxOpped]`, `§f§4[§6Paradox§4]§f ${player.name}§f is no longer in vanish.`);
    } else {
        player.addTag("vanish");
        player.triggerEvent("vanish");
        sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You are now vanished!`);
        sendMsg(`@a[tag=paradoxOpped]`, `§f§4[§6Paradox§4]§f ${player.name}§f is now vanished!`);
    }
}
