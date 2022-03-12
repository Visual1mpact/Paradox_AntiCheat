import { disabler } from "../../util.js";

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
    
    // make sure the user has permissions to run the command
    // if not then show them non staff commands
    if (!player.hasTag('paradoxOpped')) {
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§l§4Non-Staff Commands"}]}`);
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§6!report <username>§r - Report suspicious players to staff."}]}`);
    }

    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"\n§l§4Paradox AntiCheat Command Help"}]}`);

    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"\n§l§4Moderation Commands"}]}`);

    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!help§r - Shows this help page."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!ban <username> <reason>§r - Ban the specified user."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!kick <username> <reason>§r - Kick the specified user."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!mute <username> <reason>§r - Mute the specified user."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!unmute <username> <reason>§r - Unmute the specified user."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!notify§r - Enables/Disables cheat notifications."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!credits§r - Shows credits, thats it."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!op <username>§r - Op's player in Paradox AntiCheat features."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!deop <username>§r - Revokes Op player in Paradox AntiCheat features."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!modules§r - View all enabled or disabled modules."}]}`);

    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"\n§l§4Optional Features"}]}`);

    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!allowgma§r - Enables/disables Gamemode 2(Adventure) to be used."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!allowgmc§r - Enables/disables Gamemode 1(Creative) to be used."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!allowgms§r - Enables/disables Gamemode 0(Survival) to be used."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!removecb§r - Enables/disables Anti Command Blocks (Clears all when enabled)."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!bedrockvalidate§r - Checks validation of bedrock."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!overridecbe§r - Forces the commandblocksenabled gamerule to be enabled or disabled at all times."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!nofrostwalker§r - Enables/disables Anti Frostwalker. High levels of Frostwalker can crash realms."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!worldborder <option>§r - Sets the World Border. Option: [1k, 5k, 10k, 25k, 50k, 100k, disable]"}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!autoclicker§r - Enables/disables Anti Autoclicker."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!jesusa§r - Checks if player's are walking on water and lava)."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!phase§r - Enables/disables Anti Phase (Moving through blocks)."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!enchantedarmor§r - Enables/disables Anti Enchanted Armor for all players."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!autoaura§r - Enables/disables Auto KillAura checks for all players."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!antikb§r - Enables/disables Anti Knockback for all players."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!badpackets2§r - Checks message length for each broadcast."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!spammera§r - Checks if message is sent while moving."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!spammerb§r - Checks if message is sent while swinging."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!spammerc§r - Checks if message is sent while using items."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!spammerd§r - Checks if message is sent while GUI is open."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!antispam§r - Checks for spamming in chat with 2 second cooldown."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!crashera§r - Prevents Horion crasher."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!namespoofa§r - Checks if player's name exceeds character limitations."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!namespoofb§r - Checks if player's name has Non ASCII characters."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!reacha§r - Checks if player's place blocks beyond reach."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!reachb§r - Checks if player's break blocks beyond reach."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!noslowa§r - Checks if player's are speed hacking."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!flya§r - Checks if player's are flying in survival."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!illegalitemsa§r - Checks if player's have illegal items in inventory."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!illegalitemsb§r - Checks if player's use illegal items."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!illegalitemsc§r - Checks if player's place illegal items."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!antiscaffolda§r - Checks player's for illegal scaffolding."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!antinukera§r - Checks player's for nuking blocks."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!xraya§r - Notify's staff when and where player's mine specific ores."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!banwindow§r - Disables server ban to allow banned players to join (Does not include global ban)."}]}`);

    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"\n§l§4Tools and Utilites"}]}`);

    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!auracheck <username>§r - Manual test for KillAura."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!ecwipe <username>§r - Clears a players ender chest."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!fly <username>§r - Enables/disables fly mode in survival."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!freeze <username>§r - Freeze a player and make it so they cant move."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!stats <username>§r - View a specific players anticheat logs."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!fullreport§r - View everyones anticheat logs."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!vanish§r - Enables/disables vanish (Used for spying on suspects)."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!tag <username> Rank:rank§r - Add tags to username in chat window."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!tag <username> reset§r - Remove tags to username in chat window."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!clearchat§r - Clears chat."}]}`);
    player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"§6!invsee <username>§r - Lists all the items in the usernames inventory."}]}`);

    return player.runCommand(`tellraw ${disabler(player.nameTag)} {"rawtext":[{"text":"\n"}]}`);
}
