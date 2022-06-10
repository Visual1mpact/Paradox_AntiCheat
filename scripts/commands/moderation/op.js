/* eslint no-var: "off"*/
/* eslint no-redeclare: "off"*/
import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, disabler, generateUUID, getPrefix } from "../../util.js";

const World = world;

function opHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.op) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: op
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: op [optional]
§4[§6Optional§4]§r: username, help
§4[§6Description§4]§r: Grants permission to use Paradox AntiCheat features.
§4[§6Examples§4]§r:
    ${prefix}op ${disabler(player.nameTag)}
    ${prefix}op help
"}]}`);
}

/**
 * @name op
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function op(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/op.js:9)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty('hash');
    let salt = player.getDynamicProperty('salt');
    let encode;
    // If no salt then create one
    if (salt === undefined && args[0] === config.modules.encryption.password) {
        player.setDynamicProperty('salt', generateUUID());
        salt = player.getDynamicProperty('salt');
    }
    // If no hash then create one
    if (hash === undefined && args[0] === config.modules.encryption.password) {
        encode = crypto(salt, config.modules.encryption.password);
        player.setDynamicProperty('hash', encode);
        hash = player.getDynamicProperty('hash');
    } else {
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
    }
    // Make sure the user has permissions to run the command
    if (hash === undefined || hash !== encode && args[0] !== config.modules.encryption.password) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    } else if (hash === encode && args[0] === config.modules.encryption.password) {
        // Old stuff that makes up for less than 5% of the project
        return player.runCommand(`execute "${disabler(player.nameTag)}" ~~~ function op`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.op) {
        return opHelp(player, prefix);
    }

    // Are there arguements
    if (!args.length) {
        return opHelp(player, prefix);
    }
    
    // try to find the player requested
    let member;
    if (args.length) {
        for (let pl of World.getPlayers()) {
            if (pl.nameTag.toLowerCase().includes(args[0].toLowerCase().replace(/"|\\|@/g, ""))) {
                member = pl;
            }
        }
    }
    
    if (!member) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Couldnt find that player!"}]}`);
    }

    // Check for hash/salt and validate password
    let memberHash = member.getDynamicProperty('hash');
    let memberSalt = member.getDynamicProperty('salt');
    // If no salt then create one
    if (memberSalt === undefined) {
        member.setDynamicProperty('salt', generateUUID());
        memberSalt = member.getDynamicProperty('salt');
    }
    // If no hash then create one
    if (memberHash === undefined) {
        let encode = crypto(memberSalt, config.modules.encryption.password);
        member.setDynamicProperty('hash', encode);
        memberHash = member.getDynamicProperty('hash');
    }
    return player.runCommand(`execute "${disabler(member.nameTag)}" ~~~ function op`);
}
