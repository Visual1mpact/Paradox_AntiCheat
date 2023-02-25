import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { Hotbar } from "../../penrose/tickevent/hotbar/hotbar.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;

function hotbarHelp(player: Player, prefix: string, hotbarBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.hotbar) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (hotbarBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: hotbar`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: hotbar [optional]`,
        `§4[§6Optional§4]§r: message, disable, help`,
        `§4[§6Description§4]§r: Displays a hotbar message for all player's currently online.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}hotbar disable`,
        `    ${prefix}hotbar Anarchy Server | Anti 32k | Realm Code: 34fhf843`,
        `    ${prefix}hotbar help`,
    ]);
}

/**
 * @name hotbar
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function hotbar(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/hotbar.js:37)");
    }

    message.cancel = true;

    let player = message.sender;

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
    const hotbarBoolean = World.getDynamicProperty("hotbar_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Are there arguements
    if (!args.length) {
        return hotbarHelp(player, prefix, hotbarBoolean);
    }

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.hotbar) {
        return hotbarHelp(player, prefix, hotbarBoolean);
    }

    if (hotbarBoolean === false && args[0].toLowerCase() !== "disable") {
        // Allow
        World.setDynamicProperty("hotbar_b", true);
        if (args.length >= 1) {
            config.modules.hotbar.message = args.join(" ");
        }
        sendMsg("@a[tag=paradoxOpped]", `${player.nameTag} has enabled §6Hotbar`);
        Hotbar();
    } else if (hotbarBoolean === true && args[0].toLowerCase() === "disable") {
        // Deny
        World.setDynamicProperty("hotbar_b", false);
        sendMsg("@a[tag=paradoxOpped]", `${player.nameTag} has disabled §6Hotbar`);
    } else if (hotbarBoolean === true && args.length >= 1) {
        config.modules.hotbar.message = args.join(" ");
        sendMsg("@a[tag=paradoxOpped]", `${player.nameTag} has updated §6Hotbar`);
    } else {
        return hotbarHelp(player, prefix, hotbarBoolean);
    }
}
