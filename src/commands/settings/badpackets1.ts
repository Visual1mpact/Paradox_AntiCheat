import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "@minecraft/server";
import { BadPackets1 } from "../../penrose/beforechatevent/spammer/badpackets_1.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";

const World = world;

function badpackets1Help(player: Player, prefix: string, badPackets1Boolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.badpackets1) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (badPackets1Boolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: badpackets1`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: badpackets1 [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for message lengths with each broadcast.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}badpackets1`,
        `    ${prefix}badpackets1 help`,
    ]);
}

/**
 * @name badpackets1
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function badpackets1(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/badpackets1.js:36)");
    }

    message.cancel = true;

    const player = message.sender;

    // Check for hash/salt and validate password
    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const badPackets1Boolean = dynamicPropertyRegistry.get("badpackets1_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.badpackets1) {
        return badpackets1Help(player, prefix, badPackets1Boolean);
    }

    if (badPackets1Boolean === false) {
        // Allow
        dynamicPropertyRegistry.set("badpackets1_b", true);
        World.setDynamicProperty("badpackets1_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Badpackets1§r!`);
        BadPackets1();
    } else if (badPackets1Boolean === true) {
        // Deny
        dynamicPropertyRegistry.set("badpackets1_b", false);
        World.setDynamicProperty("badpackets1_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Badpackets1§r!`);
    }
}
