import config from "../../data/config.js";
import { getScore, disabler, getPrefix, crypto } from "../../util.js";

function modulesHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.modules) {
        commandStatus = "§6[§4DISABLED§6]§r"
    } else {
        commandStatus = "§6[§aENABLED§6]§r"
    }
    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§4[§6Command§4]§r: modules
§4[§6Status§4]§r: ${commandStatus}
§4[§6Usage§4]§r: modules [optional]
§4[§6Optional§4]§r: help
§4[§6Description§4]§r: Shows a list of modules that are enabled and disabled in Paradox.
§4[§6Examples§4]§r:
    ${prefix}modules
    ${prefix}modules help
"}]}`)
}

/**
 * @name module
 * @param {object} message - Message object
 * @param {array} args - Additional arguments provided (optional).
 */
 export function modules(message, args) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/modules.js:6)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag(crypto)) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if (argCheck && args[0].toLowerCase() === "help" || !config.customcommands.modules) {
        return modulesHelp(player, prefix);
    }

    // scores
    let commandblocks = getScore('commandblocks', player);
    let cmds = getScore('cmds', player);
    let worldborder = getScore('worldborder', player);
    let autoclicker = getScore('autoclicker', player);
    let encharmor = getScore('encharmor', player);
    let autoaura = getScore('autoaura', player);
    let antikb = getScore('antikb', player);

    if (config.modules.adventureGM.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-GMA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r Anti-GMA is currently §4DISABLED"}]}`);
    }

    if (config.modules.survivalGM.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-GMS is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-GMS is currently §4DISABLED"}]}`);
    }

    if (config.modules.creativeGM.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-GMC is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-GMC is currently §4DISABLED"}]}`);
    }

    if (commandblocks >= 1) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r RemoveCommandBlocks is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r RemoveCommandBlocks is currently §4DISABLED"}]}`);
    }

    if (cmds >= 2) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r OverideCommandBlocksEnabled is set to §4DISABLED"}]}`);
    } else if (cmds === 1) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r OverideCommandBlocksEnabled is set to §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r OverideCommandBlocksEnabled is currently §4DISABLED"}]}`);
    }
    
    if (worldborder > 0) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r World Border is set to §a${worldborder}"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r World Border is currently §4DISABLED"}]}`);
    }

    if (autoclicker >= 1) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Autoclicker is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Autoclicker is currently §4DISABLED"}]}`);
    }

    if (encharmor >= 1) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Enchanted Armor is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Enchanted Armor is currently §4DISABLED"}]}`);
    }

    if (autoaura >= 1) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Autoaura is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Autoaura is currently §4DISABLED"}]}`);
    }

    if (antikb >= 1) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Knockback is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Knockback is currently §4DISABLED"}]}`);
    }

    if (config.modules.badpackets1.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Badpackets 1 is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Badpackets 1 is currently §4DISABLED"}]}`);
    }

    if (config.modules.spammerA.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r SpammerA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r SpammerA is currently §4DISABLED"}]}`);
    }

    if (config.modules.spammerB.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r SpammerB is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r SpammerB is currently §4DISABLED"}]}`);
    }

    if (config.modules.spammerC.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r SpammerC is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r SpammerC is currently §4DISABLED"}]}`);
    }

    if (config.modules.spammerD.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r SpammerD is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r SpammerD is currently §4DISABLED"}]}`);
    }

    if (config.modules.antispam.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Spam is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Spam is currently §4DISABLED"}]}`);
    }

    if (config.modules.crasherA.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r CrasherA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r CrasherA is currently §4DISABLED"}]}`);
    }

    if (config.modules.namespoofA.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r NamespoofA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r NamespoofA is currently §4DISABLED"}]}`);
    }

    if (config.modules.namespoofB.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r NamespoofB is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r NamespoofB is currently §4DISABLED"}]}`);
    }

    if (config.modules.bedrockValidate.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Bedrock Validate is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Bedrock Validate is currently §4DISABLED"}]}`);
    }

    if (config.modules.reachA.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ReachA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ReachA is currently §4DISABLED"}]}`);
    }

    if (config.modules.reachB.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ReachB is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ReachB is currently §4DISABLED"}]}`);
    }

    if (config.modules.reachC.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ReachC is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ReachC is currently §4DISABLED"}]}`);
    }

    if (config.modules.jesusA.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r JesusA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r JesusA is currently §4DISABLED"}]}`);
    }

    if (config.modules.noslowA.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r NoSlowA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r NoSlowA is currently §4DISABLED"}]}`);
    }

    if (config.modules.invalidsprintA.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r InvalidSprintA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r InvalidSprintA is currently §4DISABLED"}]}`);
    }

    if (config.modules.flyA.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r FlyA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r FlyA is currently §4DISABLED"}]}`);
    }

    if (config.modules.illegalitemsA.enabled) {
        let verification;
        if (config.modules.stackBan.enabled) {
            verification = "§aENABLED§r"
        } else {
            verification = "§4DISABLED§r"
        }
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsA is currently §aENABLED§r [Ban Illegal Stacks ${verification}]"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsA is currently §4DISABLED"}]}`);
    }

    if (config.modules.illegalitemsB.enabled) {
        let verification;
        if (config.modules.stackBan.enabled) {
            verification = "§aENABLED§r"
        } else {
            verification = "§4DISABLED§r"
        }
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsB is currently §aENABLED§r [Ban Illegal Stacks ${verification}]"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsB is currently §4DISABLED"}]}`);
    }

    if (config.modules.illegalitemsC.enabled) {
        let verification;
        if (config.modules.stackBan.enabled) {
            verification = "§aENABLED§r"
        } else {
            verification = "§4DISABLED§r"
        }
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsC is currently §aENABLED§r [Ban Illegal Stacks ${verification}]"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsC is currently §4DISABLED"}]}`);
    }

    if (config.modules.illegalitemsD.enabled) {
        let verification;
        if (config.modules.stackBan.enabled) {
            verification = "§aENABLED§r"
        } else {
            verification = "§4DISABLED§r"
        }
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsD is currently §aENABLED§r [Ban Illegal Stacks ${verification}]"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsD is currently §4DISABLED"}]}`);
    }

    if (config.modules.illegalEnchantment.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalEnchantments is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalEnchantments is currently §4DISABLED"}]}`);
    }

    if (config.modules.illegalLores.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalLores is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalLores is currently §4DISABLED"}]}`);
    }

    if (config.modules.antikbA.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-KnockbackA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-KnockbackA is currently §4DISABLED"}]}`);
    }

    if (config.modules.antiscaffoldA.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-ScaffoldA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-ScaffoldA is currently §4DISABLED"}]}`);
    }

    if (config.modules.antinukerA.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-NukerA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-NukerA is currently §4DISABLED"}]}`);
    }

    if (config.modules.xrayA.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r XrayA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r XrayA is currently §4DISABLED"}]}`);
    }

    if (config.modules.chatranks.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Chat Ranks is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Chat Ranks is currently §4DISABLED"}]}`);
    }

    if (config.modules.antishulker.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Shulkers is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Shulkers is currently §4DISABLED"}]}`);
    }

    if (config.modules.antiTeleport.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Teleport is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Teleport is currently §4DISABLED"}]}`);
    }

    if (config.modules.hotbar.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Hotbar is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Hotbar is currently §4DISABLED"}]}`);
    }

    if (config.modules.ops.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r OPS is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r OPS is currently §4DISABLED"}]}`);
    }

    if (config.modules.rbcr.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r RBCR is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r RBCR is currently §4DISABLED"}]}`);
    }
}
