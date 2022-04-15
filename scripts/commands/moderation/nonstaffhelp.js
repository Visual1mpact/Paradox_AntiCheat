import { disabler, getPrefix } from "../../util.js";
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
        sethomeCommand = `§6${prefix}sethome§r - Saves current coordinates as home.`;
    } else if (config.customcommands.sethome === false) {
        sethomeCommand = `§6${prefix}sethome§r - Command §4DISABLED§r.`;
    }

    let gohomeCommand;
    if (config.customcommands.gohome === true) {
        gohomeCommand = `§6${prefix}gohome§r - Teleport back to saved home coordinates.`;
    } else if (config.customcommands.gohome === false) {
        gohomeCommand = `§6${prefix}gohome§r - Command §4DISABLED§r.`;
    }
    
    // Non staff commands
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§l§6[§4Non-Staff Commands§6]§r
${reportCommand}
${sethomeCommand}
${gohomeCommand}
        "}]}`);
    }
}
