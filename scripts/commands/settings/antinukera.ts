import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "mojang-minecraft";
import { NukerA } from "../../penrose/blockbreakevent/nuker/nuker_a.js";

const World = world;

function antinukeraHelp(player: Player, prefix: string, antiNukerABoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.antinukera) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (antiNukerABoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: antinukera`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: antinukera [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Checks player's for nuking blocks.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}antinukera`,
        `    ${prefix}antinukera help`,
    ]);
}

/**
 * @name antinukerA
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function antinukerA(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/antinukera.js:36)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    let antiNukerABoolean = World.getDynamicProperty('antinukera_b');
    if (antiNukerABoolean === undefined) {
        antiNukerABoolean = config.modules.antinukerA.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.antinukera) {
        return antinukeraHelp(player, prefix, antiNukerABoolean);
    }

    if (antiNukerABoolean === false) {
        // Allow
        World.setDynamicProperty('antinukera_b', true);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6AntiNukerA§r!`);
        NukerA();
        return;
    } else if (antiNukerABoolean === true) {
        // Deny
        World.setDynamicProperty('antinukera_b', false);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4AntiNukerA§r!`);
        return;
    }
}
