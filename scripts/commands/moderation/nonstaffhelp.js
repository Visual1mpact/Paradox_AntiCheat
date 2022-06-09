import { crypto, disabler, getPrefix } from "../../util.js";
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

    let reportCommand;
    if (config.customcommands.report === true) {
        reportCommand = `§6${prefix}report <username>§r - Report suspicious players to staff.`;
    } else if (config.customcommands.report === false) {
        reportCommand = `§6${prefix}report <username>§r - Command §4DISABLED§r.`;
    }

    let sethomeCommand;
    if (config.customcommands.sethome === true) {
        sethomeCommand = `§6${prefix}sethome <name>§r - Saves current coordinates as home.`;
    } else if (config.customcommands.sethome === false) {
        sethomeCommand = `§6${prefix}sethome <name>§r - Command §4DISABLED§r.`;
    }

    let gohomeCommand;
    if (config.customcommands.gohome === true) {
        gohomeCommand = `§6${prefix}gohome <name>§r - Teleport back to saved home coordinates.`;
    } else if (config.customcommands.gohome === false) {
        gohomeCommand = `§6${prefix}gohome <name>§r - Command §4DISABLED§r.`;
    }

    let listHomeCommand;
    if (config.customcommands.listhome === true) {
        listHomeCommand = `§6${prefix}listhome§r - Shows your list of saved locations.`;
    } else if (config.customcommands.listhome === false) {
        listHomeCommand = `§6${prefix}listhome§r - Command §4DISABLED§r.`;
    }

    let delHomeCommand;
    if (config.customcommands.delhome === true) {
        delHomeCommand = `§6${prefix}delhome <name>§r - Deletes a saved location from list.`;
    } else if (config.customcommands.delhome === false) {
        delHomeCommand = `§6${prefix}delhome <name>§r - Command §4DISABLED§r.`;
    }
    
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Non staff commands
    if (hash === undefined || encode !== hash) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§l§6[§4Non-Staff Commands§6]§r
${reportCommand}
${sethomeCommand}
${gohomeCommand}
${listHomeCommand}
${delHomeCommand}
        "}]}`);
    }
}
