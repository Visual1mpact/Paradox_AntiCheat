import { crypto, getPrefix, sendMsg, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";
import { BeforeChatEvent, Player, world } from "mojang-minecraft";
import { CrasherA } from "../../penrose/tickevent/crasher/crasher_a.js";

const World = world;

function crasheraHelp(player: Player, prefix: string, crasherABoolean: string | number | boolean) {
    let commandStatus: string;
    if (!config.customcommands.crashera) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    let moduleStatus: string;
    if (crasherABoolean === false) {
        moduleStatus = "§6[§4DISABLED§6]§r";
    } else {
        moduleStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: crashera`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Module§4]§r: ${moduleStatus}`,
        `§4[§6Usage§4]§r: crashera [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Toggles checks for the infamous Horion Crasher.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}crashera`,
        `    ${prefix}crashera help`,
    ]);
}

/**
 * @name crasherA
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function crasherA(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/crashera.js:36)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Get Dynamic Property Boolean
    let crasherABoolean = World.getDynamicProperty("crashera_b");
    if (crasherABoolean === undefined) {
        crasherABoolean = config.modules.crasherA.enabled;
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.crashera) {
        return crasheraHelp(player, prefix, crasherABoolean);
    }

    if (crasherABoolean === false) {
        // Allow
        World.setDynamicProperty("crashera_b", true);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has enabled §6CrasherA§r!`);
        CrasherA();
        return;
    } else if (crasherABoolean === true) {
        // Deny
        World.setDynamicProperty("crashera_b", false);
        sendMsg("@a[tag=paradoxOpped]", `§r§4[§6Paradox§4]§r ${player.nameTag}§r has disabled §4CrasherA§r!`);
        return;
    }
}
