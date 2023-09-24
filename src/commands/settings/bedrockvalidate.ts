import { ChatSendAfterEvent, Player, Vector3, world } from "@minecraft/server";
import config from "../../data/config.js";
import { BedrockValidate } from "../../penrose/TickEvent/bedrock/bedrockvalidate.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

function bedrockValidateHelp(player: Player, prefix: string, bedrockValidateBoolean: string | number | boolean | Vector3) {
    let commandStatus: string;
    if (!config.customcommands.bedrockvalidate) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (bedrockValidateBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: bedrockvalidate`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: bedrockvalidate [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Toggles checks for bedrock validations.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}bedrockvalidate`,
        `    ${prefix}bedrockvalidate help`,
    ]);
}

/**
 * @name bedrockvalidate
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function bedrockvalidate(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/bedrockValidate.js:36)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const bedrockValidateBoolean = dynamicPropertyRegistry.get("bedrockvalidate_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.bedrockvalidate) {
        return bedrockValidateHelp(player, prefix, bedrockValidateBoolean);
    }

    if (bedrockValidateBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("bedrockvalidate_b", true);
        world.setDynamicProperty("bedrockvalidate_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6BedrockValidate§f!`);
        BedrockValidate();
    } else if (bedrockValidateBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("bedrockvalidate_b", false);
        world.setDynamicProperty("bedrockvalidate_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4BedrockValidate§f!`);
    }
}
