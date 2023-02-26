import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { Adventure } from "../../penrose/tickevent/gamemode/adventure.js";
import { Creative } from "../../penrose/tickevent/gamemode/creative.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function allowgmcHelp(player: Player, prefix: string, creativeGMBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.allowgmc) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (creativeGMBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: allowgmc`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: allowgmc [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles Gamemode 1 (Creative) to be used.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}allowgmc`,
        `    ${prefix}allowgmc help`,
    ]);
}

/**
 * @name allowgmc
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function allowgmc(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/allowGMC.js:37)");
    }

    message.cancel = true;

    const player = message.sender;

    // Check for hash/salt and validate password
    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    let adventureGMBoolean = World.getDynamicProperty("adventuregm_b");
    if (adventureGMBoolean === undefined) {
        adventureGMBoolean = config.modules.adventureGM.enabled;
    }
    let creativeGMBoolean = World.getDynamicProperty("creativegm_b");
    if (creativeGMBoolean === undefined) {
        creativeGMBoolean = config.modules.creativeGM.enabled;
    }
    let survivalGMBoolean = World.getDynamicProperty("survivalgm_b");
    if (survivalGMBoolean === undefined) {
        survivalGMBoolean = config.modules.survivalGM.enabled;
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.allowgmc) {
        return allowgmcHelp(player, prefix, creativeGMBoolean);
    }

    if (creativeGMBoolean === false) {
        // Allow
        World.setDynamicProperty("creativegm_b", true);
        // Make sure at least one is allowed since this could cause serious issues if all were locked down
        // We will allow Adventure Mode in this case
        if (adventureGMBoolean === true && survivalGMBoolean === true) {
            World.setDynamicProperty("adventuregm_b", false);
            sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r Since all gamemodes were disallowed, Adventure mode has been enabled.`);
            Adventure();
            return;
        }
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disallowed §4Gamemode 1 (Creative)§r to be used!`);
        Creative();
    } else if (creativeGMBoolean === true) {
        // Deny
        World.setDynamicProperty("creativegm_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has allowed §6Gamemode 1 (Creative)§r to be used!`);
    }
}
