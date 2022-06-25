import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";
import config from "../../data/config.js";

/**
 * @name nonstaffhelp
 * @param {object} message - Message object
 */
export function nonstaffhelp(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/nonstaffhelp.js:6)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for custom prefix
    let prefix = getPrefix(player);
    
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Non staff commands
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, [
            `§l§6[§4Non-Staff Commands§6]§r`,
            config.customcommands.report
                ? `§6${prefix}report <username>§r - Report suspicious players to staff.`
                : `§6${prefix}report <username>§r - Command §4DISABLED§r.`,
            config.customcommands.sethome
                ? `§6${prefix}sethome <name>§r - Saves current coordinates as home.`
                : `§6${prefix}sethome <name>§r - Command §4DISABLED§r.`,
            config.customcommands.gohome
                ? `§6${prefix}gohome <name>§r - Teleport back to saved home coordinates.`
                : `§6${prefix}gohome <name>§r - Command §4DISABLED§r.`,
            config.customcommands.listhome
                ? `§6${prefix}listhome§r - Shows your list of saved locations.`
                : `§6${prefix}listhome§r - Command §4DISABLED§r.`,
            config.customcommands.delhome
                ? `§6${prefix}delhome <name>§r - Deletes a saved location from list.`
                : `§6${prefix}delhome <name>§r - Command §4DISABLED§r.`,
        ]);
    }
}
