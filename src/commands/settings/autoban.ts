import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { AutoBan } from "../../penrose/tickevent/ban/autoban.js";

function autobanHelp(player: Player, prefix: string, autoBanBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.showrules) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (autoBanBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: autoban`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: autoban [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles the autoban module which will ban players based on their violations if above 50.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}autoban`,
        `    ${prefix}autoban help`,
    ]);
}

/**
 * @name autoban
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function autoban(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/autoban.js:36)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.scoreboard?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const autoBanBoolean = dynamicPropertyRegistry.get("autoban_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.autoban) {
        return autobanHelp(player, prefix, autoBanBoolean);
    }

    if (autoBanBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("autoban_b", true);
        world.setDynamicProperty("autoban_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6autoban§r!`);
        AutoBan();
    } else if (autoBanBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("autoban_b", false);
        world.setDynamicProperty("autoban_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4autoban§r!`);
    }
}
