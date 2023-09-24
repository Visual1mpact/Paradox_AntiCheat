import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { ChatSendAfterEvent, Player, Vector3, world } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { AntiPhaseA } from "../../penrose/TickEvent/phase/phase_a.js";

function antiphaseaHelp(player: Player, prefix: string, antiphaseABoolean: string | number | boolean | Vector3) {
    let commandStatus: string;
    if (!config.customcommands.antiphasea) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (antiphaseABoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: antiphasea`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: antiphasea [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Toggles checks for players phasing through blocks.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}antiphasea`,
        `    ${prefix}antiphasea help`,
    ]);
}

/**
 * @name antiphaseA
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function antiphaseA(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/antiphasea.js:34)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const antiphaseABoolean = dynamicPropertyRegistry.get("antiphasea_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.antiphasea) {
        return antiphaseaHelp(player, prefix, antiphaseABoolean);
    }

    if (antiphaseABoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("antiphasea_b", true);
        world.setDynamicProperty("antiphasea_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6AntiPhaseA§f!`);
        AntiPhaseA();
    } else if (antiphaseABoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("antiphasea_b", false);
        world.setDynamicProperty("antiphasea_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4AntiPhaseA§f!`);
    }
}
