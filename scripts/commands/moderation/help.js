import config from "../../data/config.js";
import { disabler, getPrefix } from "../../util.js";
import { nonstaffhelp } from "./nonstaffhelp.js";

/**
 * @name help
 * @param {object} message - Message object
 */
export function help(message) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/help.js:7)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for custom prefix
    let prefix = getPrefix(player);
    
    // make sure the user has permissions to run the command
    // if not then show them non staff commands
    if (!player.hasTag('paradoxOpped')) {
        return nonstaffhelp(message)
    }

    // Make sure the help command wasn't disabled
    if (config.customcommands.help === false) {
        config.customcommands.help === true;
    }

    let banCommand;
    if (config.customcommands.ban === true) {
        banCommand = `§6${prefix}ban <username> <reason>§r - Ban the specified user.`;
    } else if (config.customcommands.ban === false) {
        banCommand = `§6${prefix}ban <username> <reason>§r - Command §4DISABLED§r.`;
    }

    let kickCommand;
    if (config.customcommands.kick === true) {
        kickCommand = `§6${prefix}kick <username> <reason>§r - Kick the specified user.`;
    } else if (config.customcommands.kick === false) {
        kickCommand = `§6${prefix}kick <username> <reason>§r - Command §4DISABLED§r.`;
    }

    let muteCommand;
    if (config.customcommands.mute === true) {
        muteCommand = `§6${prefix}mute <username> <reason>§r - Mute the specified user.`;
    } else if (config.customcommands.mute === false) {
        muteCommand = `§6${prefix}mute <username> <reason>§r - Command §4DISABLED§r.`;
    }

    let unmuteCommand;
    if (config.customcommands.unmute === true) {
        unmuteCommand = `§6${prefix}unmute <username> <reason>§r - Unmute the specified user.`;
    } else if (config.customcommands.unmute === false) {
        unmuteCommand = `§6${prefix}unmute <username> <reason>§r - Command §4DISABLED§r.`;
    }

    let notifyCommand;
    if (config.customcommands.notify === true) {
        notifyCommand = `§6${prefix}notify§r - Enables/Disables cheat notifications.`;
    } else if (config.customcommands.notify === false) {
        notifyCommand = `§6${prefix}notify§r - Command §4DISABLED§r.`;
    }

    // Make sure credit command isn't disabled
    if (config.customcommands.credits === false) {
        config.customcommands.credits === true;
    }

    let opCommand;
    if (config.customcommands.op === true) {
        opCommand = `§6${prefix}op <username>§r - Op's player in Paradox AntiCheat features.`;
    } else if (config.customcommands.op === false) {
        opCommand = `§6${prefix}op <username>§r - Command §4DISABLED§r.`;
    }

    let deopCommand;
    if (config.customcommands.deop === true) {
        deopCommand = `§6${prefix}deop <username>§r - Revokes Op player in Paradox AntiCheat features.`;
    } else if (config.customcommands.deop === false) {
        deopCommand = `§6${prefix}deop <username>§r - Command §4DISABLED§r.`;
    }

    let modulesCommand;
    if (config.customcommands.modules === true) {
        modulesCommand = `§6${prefix}modules§r - View all enabled or disabled modules.`;
    } else if (config.customcommands.modules === false) {
        modulesCommand = `§6${prefix}modules§r - Command §4DISABLED§r.`;
    }

    let lockdownCommand;
    if (config.customcommands.lockdown === true) {
        lockdownCommand = `§6${prefix}lockdown§r - Kicks player's from server excluding Staff for maintenance.`;
    } else if (config.customcommands.lockdown === false) {
        lockdownCommand = `§6${prefix}lockdown§r - Command §4DISABLED§r.`;
    }

    let punishCommand;
    if (config.customcommands.punish === true) {
        punishCommand = `§6${prefix}punish <username>§r - Removes all items from player's inventory and ender chest.`;
    } else if (config.customcommands.punish === false) {
        punishCommand = `§6${prefix}punish <username>§r - Command §4DISABLED§r.`;
    }

    let allowgmaCommand;
    if (config.customcommands.allowgma === true) {
        allowgmaCommand = `§6${prefix}allowgma§r - Enables/disables Gamemode 2(Adventure) to be used.`;
    } else if (config.customcommands.allowgma === false) {
        allowgmaCommand = `§6${prefix}allowgma§r - Command §4DISABLED§r.`;
    }

    let allowgmcCommand;
    if (config.customcommands.allowgmc === true) {
        allowgmcCommand = `§6${prefix}allowgmc§r - Enables/disables Gamemode 1(Creative) to be used.`;
    } else if (config.customcommands.allowgmc === false) {
        allowgmcCommand = `§6${prefix}allowgmc§r - Command §4DISABLED§r.`;
    }

    let allowgmsCommand;
    if (config.customcommands.allowgms === true) {
        allowgmsCommand = `§6${prefix}allowgms§r - Enables/disables Gamemode 0(Survival) to be used.`;
    } else if (config.customcommands.allowgms === false) {
        allowgmsCommand = `§6${prefix}allowgms§r - Command §4DISABLED§r.`;
    }

    let removecbCommand;
    if (config.customcommands.removecommandblocks === true) {
        removecbCommand = `§6${prefix}removecb§r - Enables/disables Anti Command Blocks (Clears all when enabled).`;
    } else if (config.customcommands.removecommandblocks === false) {
        removecbCommand = `§6${prefix}removecb§r - Command §4DISABLED§r.`;
    }

    let bedrockValidateCommand;
    if (config.customcommands.bedrockvalidate === true) {
        bedrockValidateCommand = `§6${prefix}bedrockvalidate§r - Checks validation of bedrock.`;
    } else if (config.customcommands.bedrockvalidate === false) {
        bedrockValidateCommand = `§6${prefix}bedrockvalidate§r - Command §4DISABLED§r.`;
    }

    let overridecbeCommand;
    if (config.customcommands.overidecommandblocksenabled === true) {
        overridecbeCommand = `§6${prefix}overridecbe§r - Forces the commandblocksenabled gamerule to be enabled or disabled at all times.`;
    } else if (config.customcommands.overidecommandblocksenabled === false) {
        overridecbeCommand = `§6${prefix}overridecbe§r - Command §4DISABLED§r.`;
    }

    let worldborderCommand;
    if (config.customcommands.worldborder === true) {
        worldborderCommand = `§6${prefix}worldborder <option>§r - Sets the World Border. Option: [1k, 5k, 10k, 25k, 50k, 100k, disable]`;
    } else if (config.customcommands.worldborder === false) {
        worldborderCommand = `§6${prefix}worldborder <option>§r - Command §4DISABLED§r.`;
    }

    let autoclickerCommand;
    if (config.customcommands.autoclicker === true) {
        autoclickerCommand = `§6${prefix}autoclicker§r - Enables/disables Anti Autoclicker.`;
    } else if (config.customcommands.autoclicker === false) {
        autoclickerCommand = `§6${prefix}autoclicker§r - Command §4DISABLED§r.`;
    }

    let jesusaCommand;
    if (config.customcommands.jesusa === true) {
        jesusaCommand = `§6${prefix}jesusa§r - Checks if player's are walking on water and lava.`;
    } else if (config.customcommands.jesusa === false) {
        jesusaCommand = `§6${prefix}jesusa§r - Command §4DISABLED§r.`;
    }

    let enchantedArmorCommand;
    if (config.customcommands.enchantedarmor === true) {
        enchantedArmorCommand = `§6${prefix}enchantedarmor§r - Enables/disables Anti Enchanted Armor for all players.`;
    } else if (config.customcommands.enchantedarmor === false) {
        enchantedArmorCommand = `§6${prefix}enchantedarmor§r - Command §4DISABLED§r.`;
    }

    let autoauraCommand;
    if (config.customcommands.autoaura === true) {
        autoauraCommand = `§6${prefix}autoaura§r - Enables/disables Auto KillAura checks for all players.`;
    } else if (config.customcommands.autoaura === false) {
        autoauraCommand = `§6${prefix}autoaura§r - Command §4DISABLED§r.`;
    }

    let antikbCommand;
    if (config.customcommands.antikb === true) {
        antikbCommand = `§6${prefix}antikb§r - Enables/disables Anti Knockback for all players.`;
    } else if (config.customcommands.antikb === false) {
        antikbCommand = `§6${prefix}antikb§r - Command §4DISABLED§r.`;
    }

    let badpackets1Command;
    if (config.customcommands.badpackets1 === true) {
        badpackets1Command = `§6${prefix}badpackets1§r - Checks message length for each broadcast.`;
    } else if (config.customcommands.badpackets1 === false) {
        badpackets1Command = `§6${prefix}badpackets1§r - Command §4DISABLED§r.`;
    }

    let spammeraCommand;
    if (config.customcommands.spammera === true) {
        spammeraCommand = `§6${prefix}spammera§r - Checks if message is sent while moving.`;
    } else if (config.customcommands.spammera === false) {
        spammeraCommand = `§6${prefix}spammera§r - Command §4DISABLED§r.`;
    }

    let spammerbCommand;
    if (config.customcommands.spammerb === true) {
        spammerbCommand = `§6${prefix}spammerb§r - Checks if message is sent while swinging.`;
    } else if (config.customcommands.spammerb === false) {
        spammerbCommand = `§6${prefix}spammerb§r - Command §4DISABLED§r.`;
    }

    let spammercCommand;
    if (config.customcommands.spammerc === true) {
        spammercCommand = `§6${prefix}spammerc§r - Checks if message is sent while using items.`;
    } else if (config.customcommands.spammerc === false) {
        spammercCommand = `§6${prefix}spammerc§r - Command §4DISABLED§r.`;
    }

    let spammerdCommand;
    if (config.customcommands.spammerd === true) {
        spammerdCommand = `§6${prefix}spammerd§r - Checks if message is sent while GUI is open.`;
    } else if (config.customcommands.spammerd === false) {
        spammerdCommand = `§6${prefix}spammerd§r - Command §4DISABLED§r.`;
    }

    let antispamCommand;
    if (config.customcommands.antispam === true) {
        antispamCommand = `§6${prefix}antispam§r - Checks for spamming in chat with 2 second cooldown.`;
    } else if (config.customcommands.antispam === false) {
        antispamCommand = `§6${prefix}antispam§r - Command §4DISABLED§r.`;
    }

    let crasheraCommand;
    if (config.customcommands.crashera === true) {
        crasheraCommand = `§6${prefix}crashera§r - Prevents Horion crasher.`;
    } else if (config.customcommands.crashera === false) {
        crasheraCommand = `§6${prefix}crashera§r - Command §4DISABLED§r.`;
    }

    let namespoofaCommand;
    if (config.customcommands.namespoofa === true) {
        namespoofaCommand = `§6${prefix}namespoofa§r - Checks if player's name exceeds character limitations.`;
    } else if (config.customcommands.namespoofa === false) {
        namespoofaCommand = `§6${prefix}namespoofa§r - Command §4DISABLED§r.`;
    }

    let namespoofbCommand;
    if (config.customcommands.namespoofb === true) {
        namespoofbCommand = `§6${prefix}namespoofb§r - Checks if player's name has Non ASCII characters.`;
    } else if (config.customcommands.namespoofb === false) {
        namespoofbCommand = `§6${prefix}namespoofb§r - Command §4DISABLED§r.`;
    }

    let reachaCommand;
    if (config.customcommands.reacha === true) {
        reachaCommand = `§6${prefix}reacha§r - Checks if player's place blocks beyond reach.`;
    } else if (config.customcommands.reacha === false) {
        reachaCommand = `§6${prefix}reacha§r - Command §4DISABLED§r.`;
    }

    let reachbCommand;
    if (config.customcommands.reachb === true) {
        reachbCommand = `§6${prefix}reachb§r - Checks if player's break blocks beyond reach.`;
    } else if (config.customcommands.reachb === false) {
        reachbCommand = `§6${prefix}reachb§r - Command §4DISABLED§r.`;
    }

    let noslowaCommand;
    if (config.customcommands.noslowa === true) {
        noslowaCommand = `§6${prefix}noslowa§r - Checks if player's are speed hacking.`;
    } else if (config.customcommands.noslowa === false) {
        noslowaCommand = `§6${prefix}noslowa§r - Command §4DISABLED§r.`;
    }

    let flyaCommand;
    if (config.customcommands.flya === true) {
        flyaCommand = `§6${prefix}flya§r - Checks if player's are flying in survival.`;
    } else if (config.customcommands.flya === false) {
        flyaCommand = `§6${prefix}flya§r - Command §4DISABLED§r.`;
    }

    let illegalitemsaCommand;
    if (config.customcommands.illegalitemsa === true) {
        illegalitemsaCommand = `§6${prefix}illegalitemsa§r - Checks if player's have illegal items in inventory.`;
    } else if (config.customcommands.illegalitemsa === false) {
        illegalitemsaCommand = `§6${prefix}illegalitemsa§r - Command §4DISABLED§r.`;
    }

    let illegalitemsbCommand;
    if (config.customcommands.illegalitemsb === true) {
        illegalitemsbCommand = `§6${prefix}illegalitemsb§r - Checks if player's use illegal items.`;
    } else if (config.customcommands.illegalitemsb === false) {
        illegalitemsbCommand = `§6${prefix}illegalitemsb§r - Command §4DISABLED§r.`;
    }

    let illegalitemscCommand;
    if (config.customcommands.illegalitemsc === true) {
        illegalitemscCommand = `§6${prefix}illegalitemsc§r - Checks if player's place illegal items.`;
    } else if (config.customcommands.illegalitemsc === false) {
        illegalitemscCommand = `§6${prefix}illegalitemsc§r - Command §4DISABLED§r.`;
    }

    let stackbanCommand;
    if (config.customcommands.stackban === true) {
        stackbanCommand = `§6${prefix}stackban§r - Checks if player's have illegal stacks over 64.`;
    } else if (config.customcommands.stackban === false) {
        stackbanCommand = `§6${prefix}stackban§r - Command §4DISABLED§r.`;
    }

    let antiscaffoldaCommand;
    if (config.customcommands.antiscaffolda === true) {
        antiscaffoldaCommand = `§6${prefix}antiscaffolda§r - Checks player's for illegal scaffolding.`;
    } else if (config.customcommands.antiscaffolda === false) {
        antiscaffoldaCommand = `§6${prefix}antiscaffolda§r - Command §4DISABLED§r.`;
    }

    let antinukeraCommand;
    if (config.customcommands.antinukera === true) {
        antinukeraCommand = `§6${prefix}antinukera§r - Checks player's for nuking blocks.`;
    } else if (config.customcommands.antinukera === false) {
        antinukeraCommand = `§6${prefix}antinukera§r - Command §4DISABLED§r.`;
    }

    let xrayaCommand;
    if (config.customcommands.xraya === true) {
        xrayaCommand = `§6${prefix}xraya§r - Notify's staff when and where player's mine specific ores.`;
    } else if (config.customcommands.xraya === false) {
        xrayaCommand = `§6${prefix}xraya§r - Command §4DISABLED§r.`;
    }

    let unbanwindowCommand;
    if (config.customcommands.unbanwindow === true) {
        unbanwindowCommand = `§6${prefix}unbanwindow§r - Disables server ban to allow banned players to join (Does not include global ban).`;
    } else if (config.customcommands.unbanwindow === false) {
        unbanwindowCommand = `§6${prefix}unbanwindow§r - Command §4DISABLED§r.`;
    }

    let chatranksCommand;
    if (config.customcommands.chatranks === true) {
        chatranksCommand = `§6${prefix}chatranks§r - Enables/Disables chat ranks.`;
    } else if (config.customcommands.chatranks === false) {
        chatranksCommand = `§6${prefix}chatranks§r - Command §4DISABLED§r.`;
    }

    let antishulkerCommand;
    if (config.customcommands.antishulker === true) {
        antishulkerCommand = `§6${prefix}antishulker§r - Enables/Disables shulkers in the world.`;
    } else if (config.customcommands.antishulker === false) {
        antishulkerCommand = `§6${prefix}antishulker§r - Command §4DISABLED§r.`;
    }

    let auracheckCommand;
    if (config.customcommands.auracheck === true) {
        auracheckCommand = `§6${prefix}auracheck <username>§r - Manual test for KillAura.`;
    } else if (config.customcommands.auracheck === false) {
        auracheckCommand = `§6${prefix}auracheck <username>§r - Command §4DISABLED§r.`;
    }

    let ecwipeCommand;
    if (config.customcommands.ecwipe === true) {
        ecwipeCommand = `§6${prefix}ecwipe <username>§r - Clears a players ender chest.`;
    } else if (config.customcommands.ecwipe === false) {
        ecwipeCommand = `§6${prefix}ecwipe <username>§r - Command §4DISABLED§r.`;
    }

    let flyCommand;
    if (config.customcommands.fly === true) {
        flyCommand = `§6${prefix}fly <username>§r - Enables/disables fly mode in survival.`;
    } else if (config.customcommands.fly === false) {
        flyCommand = `§6${prefix}fly <username>§r - Command §4DISABLED§r.`;
    }

    let freezeCommand;
    if (config.customcommands.freeze === true) {
        freezeCommand = `§6${prefix}freeze <username>§r - Freeze a player and make it so they cant move.`;
    } else if (config.customcommands.freeze === false) {
        freezeCommand = `§6${prefix}freeze <username>§r - Command §4DISABLED§r.`;
    }

    let statsCommand;
    if (config.customcommands.stats === true) {
        statsCommand = `§6${prefix}stats <username>§r - View a specific players anticheat logs.`;
    } else if (config.customcommands.stats === false) {
        statsCommand = `§6${prefix}stats <username>§r - Command §4DISABLED§r.`;
    }

    let fullreportCommand;
    if (config.customcommands.fullreport === true) {
        fullreportCommand = `§6${prefix}fullreport§r - View everyones anticheat logs.`;
    } else if (config.customcommands.fullreport === false) {
        fullreportCommand = `§6${prefix}fullreport§r - Command §4DISABLED§r.`;
    }

    let vanishCommand;
    if (config.customcommands.vanish === true) {
        vanishCommand = `§6${prefix}vanish§r - Enables/disables vanish (Used for spying on suspects).`;
    } else if (config.customcommands.vanish === false) {
        vanishCommand = `§6${prefix}vanish§r - Command §4DISABLED§r.`;
    }

    let clearchatCommand;
    if (config.customcommands.clearchat === true) {
        clearchatCommand = `§6${prefix}clearchat§r - Clears chat.`;
    } else if (config.customcommands.clearchat === false) {
        clearchatCommand = `§6${prefix}clearchat§r - Command §4DISABLED§r.`;
    }

    let invseeCommand;
    if (config.customcommands.invsee === true) {
        invseeCommand = `§6${prefix}invsee <username>§r - Lists all the items in the usernames inventory.`;
    } else if (config.customcommands.invsee === false) {
        invseeCommand = `§6${prefix}invsee <username>§r - Command §4DISABLED§r.`;
    }

    let chatrank0;
    let chatrank1;
    if (config.modules.chatranks.enabled === true) {
        chatrank0 = `§6${prefix}tag <username> Rank:rank§r - Add ranks to username.`;
        chatrank1 = `§6${prefix}tag <username> reset§r - Remove rank to username.`;
    } else if (config.modules.chatranks.enabled === false) {
        chatrank0 = `§6${prefix}tag <username> Rank:rank§r - Command §4DISABLED§r.`;
        chatrank1 = `§6${prefix}tag <username> reset§r - Command §4DISABLED§r.`;
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

    let tpaCommand;
    if (config.customcommands.tpa === true) {
        tpaCommand = `§6${prefix}tpa <username>§r - Teleport to another player.`;
    } else if (config.customcommands.tpa === false) {
        tpaCommand = `§6${prefix}tpa <username>§r - Command §4DISABLED§r.`;
    }

    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§l§6[§4Paradox AntiCheat Command Help§6]§r

§l§6[§4Moderation Commands§6]§r
§6${prefix}help§r - Shows this help page.
${banCommand}
${kickCommand}
${muteCommand}
${unmuteCommand}
${notifyCommand}
§6${prefix}credits§r - Shows credits, thats it.
${opCommand}
${deopCommand}
${modulesCommand}
§6${prefix}prefix <prefix>§r - Change the prefix for commands. Max is two characters.
§6${prefix}prefix reset§r - Reset the prefix for commands.
${lockdownCommand}
${punishCommand}
${tpaCommand}

§l§6[§4Optional Features§6]§r
${allowgmaCommand}
${allowgmcCommand}
${allowgmsCommand}
${removecbCommand}
${bedrockValidateCommand}
${overridecbeCommand}
${worldborderCommand}
${autoclickerCommand}
${jesusaCommand}
${enchantedArmorCommand}
${autoauraCommand}
${antikbCommand}
${badpackets1Command}
${spammeraCommand}
${spammerbCommand}
${spammercCommand}
${spammerdCommand}
${antispamCommand}
${crasheraCommand}
${namespoofaCommand}
${namespoofbCommand}
${reachaCommand}
${reachbCommand}
${noslowaCommand}
${flyaCommand}
${illegalitemsaCommand}
${illegalitemsbCommand}
${illegalitemscCommand}
${stackbanCommand}
${antiscaffoldaCommand}
${antinukeraCommand}
${xrayaCommand}
${unbanwindowCommand}
${chatranksCommand}
${antishulkerCommand}

§l§6[§4Tools and Utilites§6]§r
${auracheckCommand}
${ecwipeCommand}
${flyCommand}
${freezeCommand}
${statsCommand}
${fullreportCommand}
${vanishCommand}
${chatrank0}
${chatrank1}
${clearchatCommand}
${invseeCommand}
${sethomeCommand}
${gohomeCommand}
    "}]}`);
}
