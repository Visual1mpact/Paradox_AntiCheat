import { world } from "mojang-minecraft";
import config from "../../data/config.js";
import { getScore, disabler, getPrefix, crypto } from "../../util.js";

const World = world;

function modulesHelp(player, prefix) {
    let commandStatus;
    if (!config.customcommands.modules) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
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
"}]}`);
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
    if (!player.hasTag('Hash:' + crypto)) {
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
    let autoclicker = getScore('autoclicker', player);
    let encharmor = getScore('encharmor', player);
    let autoaura = getScore('autoaura', player);
    let antikb = getScore('antikb', player);

    // Booleans
    let worldBorderBoolean = World.getDynamicProperty('worldborder_b');
    let xrayaBoolean = World.getDynamicProperty('xraya_b');
    let antiTeleportBoolean = World.getDynamicProperty('antiteleport_b');
    let opsBoolean = World.getDynamicProperty('ops_b');
    let noSlowBoolean = World.getDynamicProperty('noslowa_b');
    let nameSpoofABoolean = World.getDynamicProperty('namespoofa_b');
    let nameSpoofBBoolean = World.getDynamicProperty('namespoofb_b');
    let jesusABoolean = World.getDynamicProperty('jesusa_b');
    let InvalidSprintABoolean = World.getDynamicProperty('invalidsprinta_b');
    let illegalItemsABoolean = World.getDynamicProperty('illegalitemsa_b');
    let illegalItemsDBoolean = World.getDynamicProperty('illegalitemsd_b');
    let hotbarBoolean = World.getDynamicProperty('hotbar_b');
    let adventureGMBoolean = World.getDynamicProperty('adventuregm_b');
    let creativeGMBoolean = World.getDynamicProperty('creativegm_b');
    let survivalGMBoolean = World.getDynamicProperty('survivalgm_b');
    let flyABoolean = World.getDynamicProperty('flya_b');
    let crasherABoolean = World.getDynamicProperty('crashera_b');
    let bedrockValidateBoolean = World.getDynamicProperty('bedrockvalidate_b');
    let reachCBoolean = World.getDynamicProperty('reachc_b');
    let antiScaffoldABoolean = World.getDynamicProperty('antiscaffolda_b');
    let reachABoolean = World.getDynamicProperty('reacha_b');
    let illegalItemsCBoolean = World.getDynamicProperty('illegalitemsc_b');
    let reachBBoolean = World.getDynamicProperty('reachb_b');
    let antiNukerABoolean = World.getDynamicProperty('antinukera_b');
    let illegalItemsBBoolean = World.getDynamicProperty('illegalitemsb_b');
    let spammerDBoolean = World.getDynamicProperty('spammerd_b');

    // Numbers
    let worldBorderNumber = World.getDynamicProperty('worldborder_n');

    if (adventureGMBoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-GMA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r Anti-GMA is currently §4DISABLED"}]}`);
    }

    if (survivalGMBoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-GMS is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-GMS is currently §4DISABLED"}]}`);
    }

    if (creativeGMBoolean) {
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
    
    if (worldBorderBoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r World Border is set to §a${worldBorderNumber}"}]}`);
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

    if (spammerDBoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r SpammerD is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r SpammerD is currently §4DISABLED"}]}`);
    }

    if (config.modules.antispam.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Spam is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Spam is currently §4DISABLED"}]}`);
    }

    if (crasherABoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r CrasherA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r CrasherA is currently §4DISABLED"}]}`);
    }

    if (nameSpoofABoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r NamespoofA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r NamespoofA is currently §4DISABLED"}]}`);
    }

    if (nameSpoofBBoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r NamespoofB is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r NamespoofB is currently §4DISABLED"}]}`);
    }

    if (bedrockValidateBoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Bedrock Validate is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Bedrock Validate is currently §4DISABLED"}]}`);
    }

    if (reachABoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ReachA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ReachA is currently §4DISABLED"}]}`);
    }

    if (reachBBoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ReachB is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ReachB is currently §4DISABLED"}]}`);
    }

    if (reachCBoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ReachC is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r ReachC is currently §4DISABLED"}]}`);
    }

    if (jesusABoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r JesusA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r JesusA is currently §4DISABLED"}]}`);
    }

    if (noSlowBoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r NoSlowA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r NoSlowA is currently §4DISABLED"}]}`);
    }

    if (InvalidSprintABoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r InvalidSprintA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r InvalidSprintA is currently §4DISABLED"}]}`);
    }

    if (flyABoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r FlyA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r FlyA is currently §4DISABLED"}]}`);
    }

    if (illegalItemsABoolean) {
        let verification;
        if (config.modules.stackBan.enabled) {
            verification = "§aENABLED§r";
        } else {
            verification = "§4DISABLED§r";
        }
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsA is currently §aENABLED§r [Ban Illegal Stacks ${verification}]"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsA is currently §4DISABLED"}]}`);
    }

    if (illegalItemsBBoolean) {
        let verification;
        if (config.modules.stackBan.enabled) {
            verification = "§aENABLED§r";
        } else {
            verification = "§4DISABLED§r";
        }
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsB is currently §aENABLED§r [Ban Illegal Stacks ${verification}]"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsB is currently §4DISABLED"}]}`);
    }

    if (illegalItemsCBoolean) {
        let verification;
        if (config.modules.stackBan.enabled) {
            verification = "§aENABLED§r";
        } else {
            verification = "§4DISABLED§r";
        }
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsC is currently §aENABLED§r [Ban Illegal Stacks ${verification}]"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r IllegalItemsC is currently §4DISABLED"}]}`);
    }

    if (illegalItemsDBoolean) {
        let verification;
        if (config.modules.stackBan.enabled) {
            verification = "§aENABLED§r";
        } else {
            verification = "§4DISABLED§r";
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

    if (antiScaffoldABoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-ScaffoldA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-ScaffoldA is currently §4DISABLED"}]}`);
    }

    if (antiNukerABoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-NukerA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-NukerA is currently §4DISABLED"}]}`);
    }

    if (xrayaBoolean) {
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

    if (antiTeleportBoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Teleport is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-Teleport is currently §4DISABLED"}]}`);
    }

    if (hotbarBoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Hotbar is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Hotbar is currently §4DISABLED"}]}`);
    }

    if (opsBoolean) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r OPS is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r OPS is currently §4DISABLED"}]}`);
    }

    if (config.modules.rbcr.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r RBCR is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r RBCR is currently §4DISABLED"}]}`);
    }

    if (config.modules.salvage.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Salvage is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Salvage is currently §4DISABLED"}]}`);
    }
}
