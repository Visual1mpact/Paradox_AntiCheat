import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { ChatSendAfterEvent, Player, Vector3, world } from "@minecraft/server";
import { beforeAntiSpam } from "../../penrose/ChatSendBeforeEvent/chat/antispam.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { afterAntiSpam } from "../../penrose/ChatSendAfterEvent/chat/antispam.js";

function antispamHelp(player: Player, prefix: string, antiSpamBoolean: string | number | boolean | Vector3) {
    let commandStatus: string;
    if (!config.customcommands.antispam) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (antiSpamBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: antispam`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: antispam [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Checks for spamming in chat with 2 second cooldown.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}antispam`,
        `    ${prefix}antispam help`,
    ]);
}

/**
 * @name antispam
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function antispam(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/antispam.js:36)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const antiSpamBoolean = dynamicPropertyRegistry.get("antispam_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.antispam) {
        return antispamHelp(player, prefix, antiSpamBoolean);
    }

    if (antiSpamBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("antispam_b", true);
        world.setDynamicProperty("antispam_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6Anti Spam§f!`);
        beforeAntiSpam();
        afterAntiSpam();
    } else if (antiSpamBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("antispam_b", false);
        world.setDynamicProperty("antispam_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4Anti Spam§f!`);
    }
}
