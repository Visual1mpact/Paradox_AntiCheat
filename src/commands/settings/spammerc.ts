import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { ChatSendAfterEvent, Player, Vector3, world } from "@minecraft/server";
import { SpammerC } from "../../penrose/ChatSendBeforeEvent/spammer/spammer_c.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";

function spammerCHelp(player: Player, prefix: string, spammerCBoolean: string | number | boolean | Vector3) {
    let commandStatus: string;
    if (!config.customcommands.spammerc) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (spammerCBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: spammerc`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: spammerc [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Toggles checks for messages sent while using items.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}spammerc`,
        `    ${prefix}spammerc help`,
    ]);
}

/**
 * @name spammerC
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function spammerC(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/spammerC.js:36)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const spammerCBoolean = dynamicPropertyRegistry.get("spammerc_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.spammerc) {
        return spammerCHelp(player, prefix, spammerCBoolean);
    }

    if (spammerCBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("spammerc_b", true);
        world.setDynamicProperty("spammerc_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6SpammerC§f!`);
        SpammerC();
    } else if (spammerCBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("spammerc_b", false);
        world.setDynamicProperty("spammerc_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4SpammerC§f!`);
    }
}
