import { ChatSendAfterEvent, Player, Vector3, world } from "@minecraft/server";
import config from "../../data/config.js";
import { Adventure } from "../../penrose/TickEvent/gamemode/adventure.js";
import { Creative } from "../../penrose/TickEvent/gamemode/creative.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

function allowgmcHelp(player: Player, prefix: string, creativeGMBoolean: string | number | boolean | Vector3) {
    let commandStatus: string;
    if (!config.customcommands.allowgmc) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (creativeGMBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: allowgmc`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: allowgmc [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Toggles Gamemode 1 (Creative) to be used.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}allowgmc`,
        `    ${prefix}allowgmc help`,
    ]);
}

/**
 * @name allowgmc
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function allowgmc(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/allowGMC.js:37)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const adventureGMBoolean = dynamicPropertyRegistry.get("adventuregm_b");
    const creativeGMBoolean = dynamicPropertyRegistry.get("creativegm_b");
    const survivalGMBoolean = dynamicPropertyRegistry.get("survivalgm_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.allowgmc) {
        return allowgmcHelp(player, prefix, creativeGMBoolean);
    }

    if (creativeGMBoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("creativegm_b", true);
        world.setDynamicProperty("creativegm_b", true);
        // Make sure at least one is allowed since this could cause serious issues if all were locked down
        // We will allow Adventure Mode in this case
        if (adventureGMBoolean === true && survivalGMBoolean === true) {
            dynamicPropertyRegistry.set("adventuregm_b", false);
            world.setDynamicProperty("adventuregm_b", false);
            sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f Since all gamemodes were disallowed, Adventure mode has been enabled.`);
            Adventure();
            return;
        }
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has disallowed §4Gamemode 1 (Creative)§f to be used!`);
        Creative();
    } else if (creativeGMBoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("creativegm_b", false);
        world.setDynamicProperty("creativegm_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§f§4[§6Paradox§4]§f §7${player.name}§f has allowed §6Gamemode 1 (Creative)§f to be used!`);
    }
}
