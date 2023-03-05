import { BeforeChatEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

function vanishHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.vanish) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: vanish`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: vanish [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Turns the player invisible to monitor online player's.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}vanish`,
        `    ${prefix}vanish help`,
    ]);
}

/**
 * @name vanish
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function vanish(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./utility/vanish.js:26)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.vanish) {
        return vanishHelp(player, prefix);
    }

    if (player.hasTag("vanish")) {
        player.addTag("novanish");
    }

    if (player.hasTag("novanish")) {
        player.removeTag("vanish");
    }

    if (player.hasTag("novanish")) {
        player.triggerEvent("unvanish");
        await player.runCommandAsync(`effect @s clear`);
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are no longer vanished.`);
        sendMsg(`@a[tag=paradoxOpped]`, `${player.nameTag}§r is no longer in vanish.`);
    }

    if (!player.hasTag("novanish")) {
        player.addTag("vanish");
    }

    if (player.hasTag("vanish") && !player.hasTag("novanish")) {
        player.triggerEvent("vanish");
        sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You are now vanished!`);
        sendMsg(`@a[tag=paradoxOpped]`, `${player.nameTag}§r is now vanished!`);
    }

    if (player.hasTag("novanish")) {
        player.removeTag("novanish");
    }
}
