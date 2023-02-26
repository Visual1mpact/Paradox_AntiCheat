import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "@minecraft/server";
import { IllegalItemsD } from "../../penrose/tickevent/illegalitems/illegalitems_d.js";

const World = world;

function illegalItemsDHelp(player: Player, prefix: string, illegalItemsDBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.illegalitemsd) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (illegalItemsDBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: illegalitemsd`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: illegalitemsd [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for illegal dropped items.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}illegalitemsd`,
        `    ${prefix}illegalitemsd help`,
    ]);
}

/**
 * @name illegalitemsD
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function illegalitemsD(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/illegalitemsd.js:36)");
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
    let illegalItemsDBoolean = World.getDynamicProperty("illegalitemsd_b");
    if (illegalItemsDBoolean === undefined) {
        illegalItemsDBoolean = config.modules.illegalitemsD.enabled;
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.illegalitemsd) {
        return illegalItemsDHelp(player, prefix, illegalItemsDBoolean);
    }

    if (illegalItemsDBoolean === false) {
        // Allow
        World.setDynamicProperty("illegalitemsd_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6IllegalItemsD§r!`);
        IllegalItemsD();
    } else if (illegalItemsDBoolean === true) {
        // Deny
        World.setDynamicProperty("illegalitemsd_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4IllegalItemsD§r!`);
    }
}
