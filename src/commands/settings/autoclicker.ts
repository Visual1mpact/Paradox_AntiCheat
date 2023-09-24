import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import { AutoClicker } from "../../penrose/EntityHitEntityAfterEvent/autoclicker.js";

function autoclickerHelp(player: Player, prefix: string, autoClickerBoolean: boolean) {
    let commandStatus: string;
    if (!config.customcommands.autoclicker) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (autoClickerBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: autoclicker`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: autoclicker [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Toggles checks for players using autoclickers while attacking.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}autoclicker`,
        `    ${prefix}autoclicker help`,
    ]);
}

/**
 * @name autoclicker
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function autoclick(message: ChatSendAfterEvent, args: string[]) {
    handleAutoClick(message, args).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
        // Extract stack trace information
        if (error instanceof Error) {
            const stackLines = error.stack.split("\n");
            if (stackLines.length > 1) {
                const sourceInfo = stackLines;
                console.error("Error originated from:", sourceInfo[0]);
            }
        }
    });
}

async function handleAutoClick(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/autoclicker.js:33)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const autoClickerBoolean = dynamicPropertyRegistry.get("autoclicker_b") as boolean;

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.autoclicker) {
        return autoclickerHelp(player, prefix, autoClickerBoolean);
    }

    if (autoClickerBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("autoclicker_b", true);
        world.setDynamicProperty("autoclicker_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has enabled §6AutoClicker§f!`);
        AutoClicker();
    } else if (autoClickerBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("autoclicker_b", false);
        world.setDynamicProperty("autoclicker_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disabled §4AutoClicker§f!`);
    }
}
