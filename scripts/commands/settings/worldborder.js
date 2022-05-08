import config from "../../data/config.js";
import { disabler, getPrefix } from "../../util.js";

function worldBorderHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.worldborder) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    let moduleStatus;
    if (!config.modules.worldBorder.enabled) {
        moduleStatus = "§6[§4DISABLED§6]§r"
    } else {
        moduleStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: worldborder
§4[§6Status§4]§r: ${commandStatus}
§4[§6Module§4]§r: ${moduleStatus}
§4[§6Usage§4]§r: worldborder [optional]
§4[§6Optional§4]§r: 1k, 5k, 10k, 25k, 50k, 100k, disable, help
§4[§6Description§4]§r: Sets the world border and restricts players to that border.
§4[§6Examples§4]§r:
    ${prefix}worldborder 10k
    ${prefix}worldborder disable
    ${prefix}worldborder help
"}]}`)
}

/**
 * @name worldborder
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
export function worldborders(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/settings/worldborder.js:5)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.worldborder) {
        return worldBorderHelp(player, prefix);
    }

    const options = ['1k', '5k', '10k', '25k', '50k', '100k', 'disable'];

    for (let i = 0; i < options.length; i++) {
        let verify = args[i];

        if (verify === "1k") {
            // 1k
            player.runCommand(`scoreboard players set paradox:config worldborder 1`);
            player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border to 1k!"}]}`);
            config.modules.worldBorder.enabled = true;
        } else if (verify === "5k") {
            // 5k
            player.runCommand(`scoreboard players set paradox:config worldborder 2`);
            player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border to 5k!"}]}`);
            config.modules.worldBorder.enabled = true;
        } else if (verify === "10k") {
            // 10k
            player.runCommand(`scoreboard players set paradox:config worldborder 3`);
            player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border to 10k!"}]}`);
            config.modules.worldBorder.enabled = true;
        } else if (verify === "25k") {
            // 25k
            player.runCommand(`scoreboard players set paradox:config worldborder 4`);
            player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border to 25k!"}]}`);
            config.modules.worldBorder.enabled = true;
        } else if (verify === "50k") {
            // 50k
            player.runCommand(`scoreboard players set paradox:config worldborder 5`);
            player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border to 50k!"}]}`);
            config.modules.worldBorder.enabled = true;
        } else if (verify === "100k") {
            // 100k
            player.runCommand(`scoreboard players set paradox:config worldborder 6`);
            player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has set the §6World Border to 100k!"}]}`);
            config.modules.worldBorder.enabled = true;
        } else if (verify === "disable") {
            // Disable Worldborder
            player.runCommand(`scoreboard players set paradox:config worldborder 0`);
            player.runCommand(`tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has disabled the §6World Border!"}]}`);
            config.modules.worldBorder.enabled = false;
        } else {
            // Nothing matched
            player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"text":"You need to provide the border size!"}]}`);
            return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Choose the following: 1k, 5k, 10k, 25k, 50k, 100k, or disable!"}]}`);
        }
        return player.runCommand(`scoreboard players operation @a worldborder = paradox:config worldborder`);
    }
}
