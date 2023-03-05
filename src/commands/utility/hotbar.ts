import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { Hotbar } from "../../penrose/tickevent/hotbar/hotbar.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const World = world;
const configMessageBackup = new WeakMap();
// Dummy object
const dummy = [];

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
        `    ${prefix}hotbar`,
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

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const hotbarBoolean = dynamicPropertyRegistry.get("hotbar_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.hotbar) {
        return hotbarHelp(player, prefix, hotbarBoolean);
    }

    /**
     * Backup original message from config (initial usage only)
     *
     * Reload server to reset this in memory
     */
    if (configMessageBackup.has(dummy) === false) {
        configMessageBackup.set(dummy, config.modules.hotbar.message);
    }

    if ((hotbarBoolean === false && !args.length) || (hotbarBoolean === false && args[0].toLowerCase() !== "disable")) {
        // Allow
        dynamicPropertyRegistry.set("hotbar_b", true);
        World.setDynamicProperty("hotbar_b", true);
        if (args.length >= 1) {
            config.modules.hotbar.message = args.join(" ");
        } else {
            config.modules.hotbar.message = configMessageBackup.get(dummy);
        }
        sendMsg("@a[tag=paradoxOpped]", `${player.nameTag} has enabled §6Hotbar`);
        Hotbar();
    } else if (hotbarBoolean === true && args.length === 1 && args[0].toLowerCase() === "disable") {
        // Deny
        dynamicPropertyRegistry.set("hotbar_b", false);
        World.setDynamicProperty("hotbar_b", false);
        sendMsg("@a[tag=paradoxOpped]", `${player.nameTag} has disabled §6Hotbar`);
    } else if ((hotbarBoolean === true && args.length >= 1) || (hotbarBoolean === true && !args.length)) {
        if (args.length >= 1) {
            config.modules.hotbar.message = args.join(" ");
        } else {
            config.modules.hotbar.message = configMessageBackup.get(dummy);
        }
        sendMsg("@a[tag=paradoxOpped]", `${player.nameTag} has updated §6Hotbar`);
    } else {
        return hotbarHelp(player, prefix, hotbarBoolean);
    }
}
