import { ChatSendAfterEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";

function lockdownHelp(player: Player, prefix: string, lockdownBoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.lockdown) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (lockdownBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: lockdown`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: lockdown [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Kicks player's from server excluding Staff for maintenance.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}lockdown`,
        `    ${prefix}lockdown help`,
    ]);
}

/**
 * @name lockdown
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export async function lockdown(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/lockdown.js:37)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    const lockdownBoolean = dynamicPropertyRegistry.get("lockdown_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.lockdown) {
        return lockdownHelp(player, prefix, lockdownBoolean);
    }

    // If already locked down then unlock the server
    if (lockdownBoolean) {
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r Server is no longer in lockdown!`);
        dynamicPropertyRegistry.set("lockdown_b", false);
        return world.setDynamicProperty("lockdown_b", false);
    }

    // Default reason for locking it down
    const reason = "Under Maintenance! Sorry for the inconvenience.";

    // Lock it down
    const players = world.getPlayers();
    for (const pl of players) {
        // Check for hash/salt and validate password
        const hash = pl.getDynamicProperty("hash");
        const salt = pl.getDynamicProperty("salt");
        const encode = crypto?.(salt, config?.modules?.encryption?.password);
        if (hash !== undefined && encode === hash) {
            continue;
        }
        try {
            // Kick players from server
            await pl.runCommandAsync(`kick ${JSON.stringify(pl.name)} ${reason}`);
        } catch (error) {
            // Despawn players from server
            pl.triggerEvent("paradox:kick");
        }
    }
    // Shutting it down
    sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r Server is in lockdown!`);
    dynamicPropertyRegistry.set("lockdown_b", true);
    return world.setDynamicProperty("lockdown_b", true);
}
