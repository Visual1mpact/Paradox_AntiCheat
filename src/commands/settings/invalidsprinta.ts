import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "@minecraft/server";
import { InvalidSprintA } from "../../penrose/tickevent/invalidsprint/invalidsprint_a.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";

const World = world;

function invalidSprintAHelp(player: Player, prefix: string, invalidSprintABoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.invalidsprinta) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (invalidSprintABoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: invalidsprinta`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: invalidsprinta [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for illegal sprinting with blindness effect.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}invalidsprinta`,
        `    ${prefix}invalidsprinta help`,
    ]);
}

/**
 * @name invalidsprintA
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function invalidsprintA(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/invaidsprinta.js:36)");
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
    const invalidSprintABoolean = dynamicPropertyRegistry.get("invalidsprinta_b");

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.invalidsprinta) {
        return invalidSprintAHelp(player, prefix, invalidSprintABoolean);
    }

    if (invalidSprintABoolean === false) {
        // Allow
        dynamicPropertyRegistry.set("invalidsprinta_b", true);
        World.setDynamicProperty("invalidsprinta_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6InvalidSprintA§r!`);
        InvalidSprintA();
    } else if (invalidSprintABoolean === true) {
        // Deny
        dynamicPropertyRegistry.set("invalidsprinta_b", false);
        World.setDynamicProperty("invalidsprinta_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4InvalidSprintA§r!`);
    }
}
