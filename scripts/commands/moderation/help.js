import config from "../../data/config.js";
import { disabler, getPrefix } from "../../util.js";

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
        player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"\n§l§6[§4Non-Staff Commands§6]§r"}]}`);
        return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§6${prefix}report <username>§r - Report suspicious players to staff."}]}`);
    }

    let chatrank0;
    let chatrank1;
    if (config.modules.chatranks.enabled === true) {
        chatrank0 = `§6${prefix}tag <username> Rank:rank§r - Add ranks to username.`;
        chatrank1 = `§6${prefix}tag <username> reset§r - Remove rank to username.`;
    }

    return player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"
§l§6[§4Paradox AntiCheat Command Help§6]§r

§l§6[§4Moderation Commands§6]§r
§6${prefix}help§r - Shows this help page.
§6${prefix}ban <username> <reason>§r - Ban the specified user.
§6${prefix}kick <username> <reason>§r - Kick the specified user.
§6${prefix}mute <username> <reason>§r - Mute the specified user.
§6${prefix}unmute <username> <reason>§r - Unmute the specified user.
§6${prefix}notify§r - Enables/Disables cheat notifications.
§6${prefix}credits§r - Shows credits, thats it.
§6${prefix}op <username>§r - Op's player in Paradox AntiCheat features.
§6${prefix}deop <username>§r - Revokes Op player in Paradox AntiCheat features.
§6${prefix}modules§r - View all enabled or disabled modules.
§6${prefix}prefix <prefix>§r - Change the prefix for commands. Max is two characters.
§6${prefix}prefix reset§r - Reset the prefix for commands.
§6${prefix}lockdown§r - Kicks player's from server excluding Staff for maintenance.
§6${prefix}punish <username>§r - Removes all items from player's inventory and ender chest.

§l§6[§4Optional Features§6]§r
§6${prefix}allowgma§r - Enables/disables Gamemode 2(Adventure) to be used.
§6${prefix}allowgmc§r - Enables/disables Gamemode 1(Creative) to be used.
§6${prefix}allowgms§r - Enables/disables Gamemode 0(Survival) to be used.
§6${prefix}removecb§r - Enables/disables Anti Command Blocks (Clears all when enabled).
§6${prefix}bedrockvalidate§r - Checks validation of bedrock.
§6${prefix}overridecbe§r - Forces the commandblocksenabled gamerule to be enabled or disabled at all times.
§6${prefix}nofrostwalker§r - Enables/disables Anti Frostwalker. High levels of Frostwalker can crash realms.
§6${prefix}worldborder <option>§r - Sets the World Border. Option: [1k, 5k, 10k, 25k, 50k, 100k, disable]
§6${prefix}autoclicker§r - Enables/disables Anti Autoclicker.
§6${prefix}jesusa§r - Checks if player's are walking on water and lava.
§6${prefix}enchantedarmor§r - Enables/disables Anti Enchanted Armor for all players.
§6${prefix}autoaura§r - Enables/disables Auto KillAura checks for all players.
§6${prefix}antikb§r - Enables/disables Anti Knockback for all players.
§6${prefix}badpackets1§r - Checks message length for each broadcast.
§6${prefix}spammera§r - Checks if message is sent while moving.
§6${prefix}spammerb§r - Checks if message is sent while swinging.
§6${prefix}spammerc§r - Checks if message is sent while using items.
§6${prefix}spammerd§r - Checks if message is sent while GUI is open.
§6${prefix}antispam§r - Checks for spamming in chat with 2 second cooldown.
§6${prefix}crashera§r - Prevents Horion crasher.
§6${prefix}namespoofa§r - Checks if player's name exceeds character limitations.
§6${prefix}namespoofb§r - Checks if player's name has Non ASCII characters.
§6${prefix}reacha§r - Checks if player's place blocks beyond reach.
§6${prefix}reachb§r - Checks if player's break blocks beyond reach.
§6${prefix}noslowa§r - Checks if player's are speed hacking.
§6${prefix}flya§r - Checks if player's are flying in survival.
§6${prefix}illegalitemsa§r - Checks if player's have illegal items in inventory.
§6${prefix}illegalitemsb§r - Checks if player's use illegal items.
§6${prefix}illegalitemsc§r - Checks if player's place illegal items.
§6${prefix}stackban§r - Checks if player's have illegal stacks over 64.
§6${prefix}antiscaffolda§r - Checks player's for illegal scaffolding.
§6${prefix}antinukera§r - Checks player's for nuking blocks.
§6${prefix}xraya§r - Notify's staff when and where player's mine specific ores.
§6${prefix}unbanwindow§r - Disables server ban to allow banned players to join (Does not include global ban).
§6${prefix}chatranks§r - Enables/Disables chat ranks.
§6${prefix}antishulker§r - Enables/Disables shulkers in the world.

§l§6[§4Tools and Utilites§6]§r
§6${prefix}auracheck <username>§r - Manual test for KillAura.
§6${prefix}ecwipe <username>§r - Clears a players ender chest.
§6${prefix}fly <username>§r - Enables/disables fly mode in survival.
§6${prefix}freeze <username>§r - Freeze a player and make it so they cant move.
§6${prefix}stats <username>§r - View a specific players anticheat logs.
§6${prefix}fullreport§r - View everyones anticheat logs.
§6${prefix}vanish§r - Enables/disables vanish (Used for spying on suspects).
${chatrank0}
${chatrank1}
§6${prefix}clearchat§r - Clears chat.
§6${prefix}invsee <username>§r - Lists all the items in the usernames inventory.
    "}]}`);
}
