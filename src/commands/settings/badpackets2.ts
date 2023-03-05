import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "@minecraft/server";
import { BadPackets2 } from "../../penrose/tickevent/badpackets2/badpackets2.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";

const World = world;

function badpackets2Help(player: Player, prefix: string, badPackets2Boolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.badpackets2) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (badPackets2Boolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: badpackets2`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: badpackets2 [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for invalid selected slots by player.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}badpackets2`,
        `    ${prefix}badpackets2 help`,
    ]);
}

/**
 * @name badpackets2
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function badpackets2(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/badpackets2.js:36)");
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
    const badPackets2Boolean = dynamicPropertyRegistry.get("badpackets2_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.badpackets2) {
        return badpackets2Help(player, prefix, badPackets2Boolean);
    }

    if (badPackets2Boolean === false) {
        // Allow
        dynamicPropertyRegistry.set("badpackets2_b", true);
        World.setDynamicProperty("badpackets2_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Badpackets2§r!`);
        BadPackets2();
    } else if (badPackets2Boolean === true) {
        // Deny
        dynamicPropertyRegistry.set("badpackets2_b", false);
        World.setDynamicProperty("badpackets2_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Badpackets2§r!`);
    }
}
