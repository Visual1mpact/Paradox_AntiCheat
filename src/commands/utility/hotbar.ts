import { ChatSendAfterEvent, Player, Vector3, world } from "@minecraft/server";
import config from "../../data/config.js";
import { Hotbar } from "../../penrose/TickEvent/hotbar/hotbar.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

const configMessageBackup = new WeakMap();
// Dummy object
const dummy: object = [];

function hotbarHelp(player: Player, prefix: string, hotbarBoolean: string | number | boolean | Vector3) {
    let commandStatus: string;
    if (!config.customcommands.hotbar) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    let moduleStatus: string;
    if (hotbarBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§f";
    } else {
        moduleStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: hotbar`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Module§4]§f: ${moduleStatus}`,
        `§4[§6Usage§4]§f: hotbar [optional]`,
        `§4[§6Optional§4]§f: message, disable, help`,
        `§4[§6Description§4]§f: Displays a hotbar message for all player's currently online.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}hotbar`,
        `        §4- §6Display the current hotbar message§f`,
        `    ${prefix}hotbar disable`,
        `        §4- §6Disable the hotbar message§f`,
        `    ${prefix}hotbar Anarchy Server | Realm Code: 34fhf843`,
        `        §4- §6Set the hotbar message to "Anarchy Server | Realm Code: 34fhf843"§f`,
        `    ${prefix}hotbar help`,
        `        §4- §6Show command help§f`,
    ]);
}

/**
 * @name hotbar
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function hotbar(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/utility/hotbar.js:37)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
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
        world.setDynamicProperty("hotbar_b", true);
        if (args.length >= 1) {
            config.modules.hotbar.message = args.join(" ");
        } else {
            config.modules.hotbar.message = configMessageBackup.get(dummy);
        }
        sendMsg("@a[tag=paradoxOpped]", `§7${player.name}§f has enabled §6Hotbar`);
        Hotbar();
    } else if (hotbarBoolean === true && args.length === 1 && args[0].toLowerCase() === "disable") {
        // Deny
        dynamicPropertyRegistry.set("hotbar_b", false);
        world.setDynamicProperty("hotbar_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§7${player.name}§f has disabled §6Hotbar`);
    } else if ((hotbarBoolean === true && args.length >= 1) || (hotbarBoolean === true && !args.length)) {
        if (args.length >= 1) {
            config.modules.hotbar.message = args.join(" ");
        } else {
            config.modules.hotbar.message = configMessageBackup.get(dummy);
        }
        sendMsg("@a[tag=paradoxOpped]", `§7${player.name}§f has updated §6Hotbar`);
    } else {
        return hotbarHelp(player, prefix, hotbarBoolean);
    }
}
