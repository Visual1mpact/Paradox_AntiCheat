import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { AntiKnockbackA } from "../../penrose/tickevent/knockback/antikb_a.js";
import { crypto, disabler, getPrefix, getScore, sendMsgToPlayer } from "../../util.js";

const World = world;

function antikbHelp(player, prefix, antikbBoolean) {
    let commandStatus;
    if (!config.customcommands.antikb) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus;
    if (antikbBoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `§4[§6Command§4]§r: antikb`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: antikb [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles Anti Knockback for all players.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}antikb`,
        `    ${prefix}antikb help`,
    ])
}

/**
 * @name antiknockback
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function antiknockback(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/antikb.js:7)");
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

    // Get Dynamic Property Boolean
    let antikbBoolean = World.getDynamicProperty('antikb_b');
    if (antikbBoolean === undefined) {
        antikbBoolean = config.modules.antikbA.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.antikb) {
        return antikbHelp(player, prefix, antikbBoolean);
    }

    let antikbscore = getScore("antikb", player);

    if (antikbscore <= 0) {
        // Allow
        World.setDynamicProperty('antikb_b', true);
        player.runCommand(`scoreboard players set paradox:config antikb 1`);
        sendMsgToPlayer('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6Anti Knockback§r!`)
        AntiKnockbackA();
    } else if (antikbscore >= 1) {
        // Deny
        World.setDynamicProperty('antikb_b', false);
        player.runCommand(`scoreboard players set paradox:config antikb 0`);
        sendMsgToPlayer('@a[tag=paradoxOpped]', `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4Anti Knockback§r!`)
    }
    return player.runCommand(`scoreboard players operation @a antikb = paradox:config antikb`);
}
