import { BeforeChatEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, getScore, sendMsg, sendMsgToPlayer } from "../../util.js";

function autoclickerHelp(player: Player, prefix: string, autoclickerscore: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.autoclicker) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (autoclickerscore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: autoclicker`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: autoclicker [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for players using autoclickers while attacking.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}autoclicker`,
        `    ${prefix}autoclicker help`,
    ]);
}

/**
 * @name autoclicker
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function autoclick(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/autoclicker.js:33)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    const autoclickerscore = getScore("autoclicker", player);

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.autoclicker) {
        return autoclickerHelp(player, prefix, autoclickerscore);
    }

    if (autoclickerscore <= 0) {
        // Allow
        await player.runCommandAsync(`scoreboard players set paradox:config autoclicker 1`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Anti Autoclicker§r!`);
    } else if (autoclickerscore >= 1) {
        // Deny
        await player.runCommandAsync(`scoreboard players set paradox:config autoclicker 0`);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Anti Autoclicker§r!`);
    }
    return await player.runCommandAsync(`scoreboard players operation @a autoclicker = paradox:config autoclicker`);
}
