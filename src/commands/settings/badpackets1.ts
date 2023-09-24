import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { ChatSendAfterEvent, Player, Vector3, world } from "@minecraft/server";
import { BadPackets1 } from "../../penrose/ChatSendBeforeEvent/spammer/badpackets_1.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";

function badpackets1Help(player: Player, prefix: string, badPackets1Boolean: string | number | boolean | Vector3) {
    let commandStatus: string;
    if (!config.customcommands.badpackets1) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (badPackets1Boolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: badpackets1`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: badpackets1 [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Toggles checks for message lengths with each broadcast.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}badpackets1`,
        `    ${prefix}badpackets1 help`,
    ]);
}

/**
 * @name badpackets1
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function badpackets1(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/badpackets1.js:36)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
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
        world.setDynamicProperty("badpackets1_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6Badpackets1§f!`);
        BadPackets1();
    } else if (badPackets1Boolean === true) {
        // Deny
        dynamicPropertyRegistry.set("badpackets1_b", false);
        world.setDynamicProperty("badpackets1_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4Badpackets1§f!`);
    }
}
