import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { ChatSendBeforeEvent, Player, world } from "@minecraft/server";
import { IllegalItemsC } from "../../penrose/TickEvent/illegalitems/illegalitems_c.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeEvent/registry.js";

function illegalItemsCHelp(player: Player, prefix: string, illegalItemsCBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.illegalitemsc) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (illegalItemsCBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: illegalitemsc`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: illegalitemsc [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for illegal dropped items.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}illegalitemsc`,
        `    ${prefix}illegalitemsc help`,
    ]);
}

/**
 * @name illegalitemsC
 * @param {ChatSendBeforeEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function illegalitemsC(message: ChatSendBeforeEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/illegalitemsc.js:36)");
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
    const illegalItemsCBoolean = dynamicPropertyRegistry.get("illegalitemsc_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.illegalitemsc) {
        return illegalItemsCHelp(player, prefix, illegalItemsCBoolean);
    }

    if (illegalItemsCBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("illegalitemsc_b", true);
        world.setDynamicProperty("illegalitemsc_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6IllegalItemsC§r!`);
        IllegalItemsC();
    } else if (illegalItemsCBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("illegalitemsc_b", false);
        world.setDynamicProperty("illegalitemsc_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4IllegalItemsC§r!`);
    }
}
