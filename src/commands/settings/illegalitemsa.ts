import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { ChatSendAfterEvent, Player, Vector3, world } from "@minecraft/server";
import { IllegalItemsA } from "../../penrose/TickEvent/illegalitems/illegalitems_a.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";

function illegalItemsAHelp(player: Player, prefix: string, illegalItemsABoolean: string | number | boolean | Vector3) {
    let commandStatus: string;
    if (!config.customcommands.illegalitemsa) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (illegalItemsABoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: illegalitemsa`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: illegalitemsa [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Toggles checks for player's that have illegal items in inventory.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}illegalitemsa`,
        `    ${prefix}illegalitemsa help`,
    ]);
}

/**
 * @name illegalitemsA
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function illegalitemsA(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/illegalitemsa.js:36)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const illegalItemsABoolean = dynamicPropertyRegistry.get("illegalitemsa_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.illegalitemsa) {
        return illegalItemsAHelp(player, prefix, illegalItemsABoolean);
    }

    if (illegalItemsABoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("illegalitemsa_b", true);
        world.setDynamicProperty("illegalitemsa_b", true);
        const nohasTag = world.getPlayers({ excludeTags: ["illegalitemsA"] });
        for (const temp of nohasTag) {
            temp.addTag("illegalitemsA");
        }
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6IllegalItemsA§f!`);
        IllegalItemsA();
    } else if (illegalItemsABoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("illegalitemsa_b", false);
        world.setDynamicProperty("illegalitemsa_b", false);
        const hasTag = world.getPlayers({ tags: ["illegalitemsA"] });
        for (const temp of hasTag) {
            temp.removeTag("illegalitemsA");
        }
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4IllegalItemsA§f!`);
    }
}
