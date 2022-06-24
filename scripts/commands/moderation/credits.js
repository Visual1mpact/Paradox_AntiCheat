import config from "../../data/config.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";

function creditsHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.credits) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: credits`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: credits [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Shows credits for Paradox Anti Cheat.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}credits`,
        `    ${prefix}credits help`,
    ]);
}

/**
 * @name credits
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function credits(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/credits.js:7)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.credits) {
        return creditsHelp(player, prefix);
    }

    sendMsgToPlayer(player, [
        ` `,
        `§l§6                    Based on Scythe AntiCheat`,
        `§l§4-----------------------------------------------------`,
        `§lGithub:§r https://https://github.com/MrDiamond64/Scythe-AntiCheat`,
        `§lDeveloped and maintained by MrDiamond64`,
        ` `,
        `§l§6                 Major Contributers For Scythe`,
        `§l§4-----------------------------------------------------`,
        `Visual1mpact#1435 - Porting function-based commands to GameTest commands and finding many bugs`,
        ` `,
        `§l§6                        Paradox AntiCheat`,
        `§l§4-----------------------------------------------------`,
        `§lGithub:§r https://github.com/Visual1mpact/Paradox_AntiCheat`,
        `§lParadox AntiCheat§r - a utility to fight against malicious hackers on Bedrock Edition.`,
        `§lDeveloped and maintained by Visual1mpact`,
        ` `,
        `§l§6                 Major Contributers For Paradox`,
        `§l§4-----------------------------------------------------`,
        `Glitch#8024 - Implementing features and bug fixes`,
        `FrostIce482#8139 - Implementing features, enhancing debugging, and bug fixes`,
        ` `,
    ]);
    return;
}
