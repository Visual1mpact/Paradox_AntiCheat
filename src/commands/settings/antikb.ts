import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { AntiKnockbackA } from "../../penrose/TickEvent/knockback/antikb_a.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, getScore, sendMsg, sendMsgToPlayer } from "../../util.js";

function antikbHelp(player: Player, prefix: string, antikbBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.antikb) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (antikbBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: antikb`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: antikb [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Toggles Anti Knockback for all players.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}antikb`,
        `    ${prefix}antikb help`,
    ]);
}

/**
 * @name antiknockback
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function antiknockback(message: ChatSendAfterEvent, args: string[]) {
    handleAntiKnockback(message, args).catch((error) => {
        console.error("Paradox Unhandled Rejection: ", error);
    });
}

async function handleAntiKnockback(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/antikb.js:36)");
    }

    const player = message.sender;

    if (config.debug) {
        player.sendMessage("§f§4[§6Paradox§4]§f Anti-Knockback is in development and locked behing Debug Mode");
    }

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const antikbBoolean = dynamicPropertyRegistry.get("antikb_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.antikb) {
        return antikbHelp(player, prefix, antikbBoolean);
    }

    const antikbscore = getScore("antikb", player);

    if (antikbscore <= 0) {
        // Allow
        dynamicPropertyRegistry.set("antikb_b", true);
        world.setDynamicProperty("antikb_b", true);
        player.runCommand(`scoreboard players set paradox:config antikb 1`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has enabled §6Anti Knockback§f!`);
        AntiKnockbackA();
    } else if (antikbscore >= 1) {
        // Deny
        dynamicPropertyRegistry.set("antikb_b", false);
        world.setDynamicProperty("antikb_b", false);
        player.runCommand(`scoreboard players set paradox:config antikb 0`);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f ${player.name}§f has disabled §4Anti Knockback§f!`);
    }
    return player.runCommand(`scoreboard players operation @a antikb = paradox:config antikb`);
}
