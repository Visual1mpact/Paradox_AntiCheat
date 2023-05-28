import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { ChatSendBeforeEvent, Player, world } from "@minecraft/server";
import { OPS } from "../../penrose/TickEvent/oneplayersleep/oneplayersleep.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeEvent/registry.js";

function opsHelp(player: Player, prefix: string, opsBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.ops) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (opsBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: ops`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: ops [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles One Player Sleep (OPS) for all online players.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}ops`,
        `    ${prefix}ops help`,
    ]);
}

/**
 * @name ops
 * @param {ChatSendBeforeEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function ops(message: ChatSendBeforeEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/oneplayersleep.js:36)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const opsBoolean = dynamicPropertyRegistry.get("ops_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.ops) {
        return opsHelp(player, prefix, opsBoolean);
    }

    if (opsBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("ops_b", true);
        world.setDynamicProperty("ops_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6OPS§r!`);
        OPS();
    } else if (opsBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("ops_b", false);
        world.setDynamicProperty("ops_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4OPS§r!`);
    }
}
