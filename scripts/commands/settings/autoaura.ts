import { BeforeChatEvent, Player } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, getPrefix, getScore, sendMsg, sendMsgToPlayer } from "../../util.js";

function autoauraHelp(player: Player, prefix: string, autoaurascore: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.autoaura) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (autoaurascore <= 0) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: autoaura`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: autoaura [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles Auto KillAura checks for all players.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}autoaura`,
        `    ${prefix}autoaura help`,
    ]);
}

/**
 * @name autoaura
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function autokillaura(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/autoaura.js:33)");
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

    let autoaurascore = getScore("autoaura", player);

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.autoaura) {
        return autoauraHelp(player, prefix, autoaurascore);
    }

    if (autoaurascore <= 0) {
        // Allow
        player.runCommand(`scoreboard players set paradox:config autoaura 1`);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Autoaura§r!`);
    } else if (autoaurascore >= 1) {
        // Deny
        player.runCommand(`scoreboard players set paradox:config autoaura 0`);
        sendMsg('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Autoaura§r!`);
    }
    return player.runCommand(`scoreboard players operation @a autoaura = paradox:config autoaura`);
}
