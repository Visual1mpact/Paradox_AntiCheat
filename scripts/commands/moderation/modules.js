import config from "../../data/config.js";
import { getScore, disabler } from "../../util.js";

/**
 * @name module
 * @param {object} message - Message object
 */
 export function modules(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/modules.js:6)");
    }

    message.cancel = true;

    let player = message.sender;
    
    // make sure the user has permissions to run the command
    if (!player.hasTag('paradoxOpped')) {
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"You need to be Paradox-Opped to use this command."}]}`);
    }

    // scores
    let gma = getScore('gma', player);
    let gms = getScore('gms', player);
    let gmc = getScore('gmc', player);
    let commandblocks = getScore('commandblocks', player);
    let cmds = getScore('cmds', player);
    let worldborder = getScore('worldborder', player);
    let frostwalker = getScore('frostwalker', player);
    let autoclicker = getScore('autoclicker', player);
    let encharmor = getScore('encharmor', player);
    let autoaura = getScore('autoaura', player);
    let antikb = getScore('antikb', player);

    if (gma >= 1) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-GMA is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r Anti-GMA is currently §4DISABLED"}]}`);
    }

    if (gms >= 1) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-GMS is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Anti-GMS is currently §4DISABLED"}]}`);
    }

    if (gmc >= 1) {
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
    
    if (worldborder === 1) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r World border is set to §a1k"}]}`);
    } else if (worldborder === 2) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r World border is set to §a5k"}]}`);
    } else if (worldborder === 3) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r World border is set to §a10k"}]}`);
    } else if (worldborder === 4) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r World border is set to §a25k"}]}`);
    } else if (worldborder === 5) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r World border is set to §a50k"}]}`);
    } else if (worldborder === 6) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r World border is set to §a100k"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r World Border is set to §4DISABLED"}]}`);
    }
    
    if (frostwalker >= 1) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r No Frostwalker is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r No Frostwalker is currently §4DISABLED"}]}`);
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
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Badpackets 2 is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Badpackets 2 is currently §4DISABLED"}]}`);
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

    if (config.modules.unbanWindow.enabled) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Unban Window is currently §aENABLED"}]}`);
    } else {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r Unban Window is currently §4DISABLED"}]}`);
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
}
