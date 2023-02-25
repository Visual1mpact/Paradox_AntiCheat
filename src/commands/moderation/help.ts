import { BeforeChatEvent } from "@minecraft/server";
import config from "../../data/config.js";
import { crypto, getPrefix, sendMsgToPlayer } from "../../util.js";
import { nonstaffhelp } from "./nonstaffhelp.js";

/**
 * @name help
 * @param {BeforeChatEvent} message - Message object
 */
export function help(message: BeforeChatEvent) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/help.js:8)");
    }

    message.cancel = true;

    let player = message.sender;

    // Check for custom prefix
    let prefix = getPrefix(player);

    // make sure the user has permissions to run the command
    // if not then show them non staff commands
    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    if (hash === undefined || encode !== hash) {
        return nonstaffhelp(message);
    }

    // Make sure the help command wasn't disabled
    if (config.customcommands.help === false) {
        config.customcommands.help = true;
    }

    const textDisabled = "Command §4DISABLED§r.";

    return sendMsgToPlayer(player, [
        `§l§6[§4Paradox AntiCheat Command Help§6]§r`,
        ` `,
        `§l§6[§4Moderation Commands§6]§r`,
        `§6${prefix}help§r - Shows this help page.`,
        `§6${prefix}ban <username> <reason>§r - ${config.customcommands.ban ? `Ban the specified user.` : textDisabled}`,
        `§6${prefix}unban <username>§r - ${config.customcommands.unban ? `Allows specified players to join if banned (Doesn't include global ban).` : textDisabled}`,
        `§6${prefix}kick <username> <reason>§r - ${config.customcommands.kick ? `Kick the specified user.` : textDisabled}`,
        `§6${prefix}mute <username> <reason>§r - ${config.customcommands.mute ? `Mute the specified user.` : textDisabled}`,
        `§6${prefix}unmute <username> <reason>§r - ${config.customcommands.unmute ? `Unmute the specified user.` : textDisabled}`,
        `§6${prefix}notify§r - ${config.customcommands.notify ? `Toggles cheat notifications.` : textDisabled}`,
        `§6${prefix}credits§r - Shows credits, thats it.`,
        `§6${prefix}op <username>§r - ${config.customcommands.op ? `Op's player in Paradox AntiCheat features.` : textDisabled}`,
        `§6${prefix}deop <username>§r - ${config.customcommands.deop ? `Revokes Op player in Paradox AntiCheat features.` : textDisabled}`,
        `§6${prefix}modules§r - ${config.customcommands.modules ? `View all enabled or disabled modules.` : textDisabled}`,
        `§6${prefix}prefix <prefix>§r - Change the prefix for commands. Max is two characters.`,
        `§6${prefix}prefix reset§r - Reset the prefix for commands.`,
        `§6${prefix}lockdown§r - ${config.customcommands.lockdown ? `Kicks player's from server excluding Staff for maintenance.` : textDisabled}`,
        `§6${prefix}punish <username>§r - ${config.customcommands.punish ? `Removes all items from player's inventory and ender chest.` : textDisabled}`,
        `§6${prefix}tpa <username>§r - ${config.customcommands.tpa ? `Teleport to a player or vice versa.` : textDisabled}`,
        `§6${prefix}despawn <entityName>:all§r - ${config.customcommands.despawn ? `Despawns all or specified entities if they exist.` : textDisabled}`,
        ` `,
        `§l§6[§4Optional Features§6]§r`,
        `§6${prefix}allowgma§r - ${config.customcommands.allowgma ? `Toggles Gamemode 2(Adventure) to be used.` : textDisabled}`,
        `§6${prefix}allowgmc§r - ${config.customcommands.allowgmc ? `Toggles Gamemode 1(Creative) to be used.` : textDisabled}`,
        `§6${prefix}allowgms§r - ${config.customcommands.allowgms ? `Toggles Gamemode 0(Survival) to be used.` : textDisabled}`,
        `§6${prefix}removecb§r - ${config.customcommands.removecommandblocks ? `Toggles Anti Command Blocks (Clears all when enabled).` : textDisabled}`,
        `§6${prefix}bedrockvalidate§r - ${config.customcommands.bedrockvalidate ? `Checks validation of bedrock.` : textDisabled}`,
        `§6${prefix}overridecbe§r - ${config.customcommands.overidecommandblocksenabled ? `Forces the commandblocksenabled gamerule to be enabled or disabled at all times.` : textDisabled}`,
        `§6${prefix}worldborder <value>§r - ${config.customcommands.worldborder ? `Sets the World Border for Overworld or Nether.` : textDisabled}`,
        `§6${prefix}autoclicker§r - ${config.customcommands.autoclicker ? `Toggles Anti Autoclicker.` : textDisabled}`,
        `§6${prefix}jesusa§r - ${config.customcommands.jesusa ? `Checks if player's are walking on water and lava.` : textDisabled}`,
        `§6${prefix}enchantedarmor§r - ${config.customcommands.enchantedarmor ? `Toggles Anti Enchanted Armor for all players.` : textDisabled}`,
        `§6${prefix}autoaura§r - ${config.customcommands.autoaura ? `Toggles Auto KillAura checks for all players.` : textDisabled}`,
        `§6${prefix}antikb§r - ${config.customcommands.antikb ? `Toggles Anti Knockback for all players.` : textDisabled}`,
        `§6${prefix}badpackets1§r - ${config.customcommands.badpackets1 ? `Checks message length for each broadcast.` : textDisabled}`,
        `§6${prefix}spammera§r - ${config.customcommands.spammera ? `Checks if message is sent while moving.` : textDisabled}`,
        `§6${prefix}spammerb§r - ${config.customcommands.spammerb ? `Checks if message is sent while swinging.` : textDisabled}`,
        `§6${prefix}spammerc§r - ${config.customcommands.spammerc ? `Checks if message is sent while using items.` : textDisabled}`,
        `§6${prefix}spammerd§r - ${config.customcommands.spammerd ? `Checks if message is sent while GUI is open.` : textDisabled}`,
        `§6${prefix}antispam§r - ${config.customcommands.antispam ? `Checks for spamming in chat with 2 second cooldown.` : textDisabled}`,
        `§6${prefix}crashera§r - ${config.customcommands.crashera ? `Prevents Horion crasher.` : textDisabled}`,
        `§6${prefix}crasherb§r - ${config.customcommands.crasherb ? `Prevents Arrow crasher.` : textDisabled}`,
        `§6${prefix}namespoofa§r - ${config.customcommands.namespoofa ? `Checks if player's name exceeds character limitations.` : textDisabled}`,
        `§6${prefix}namespoofb§r - ${config.customcommands.namespoofb ? `Checks if player's name has Non ASCII characters.` : textDisabled}`,
        `§6${prefix}reacha§r - ${config.customcommands.reacha ? `Checks if player's place blocks beyond reach.` : textDisabled}`,
        `§6${prefix}reachb§r - ${config.customcommands.reachb ? `Checks if player's break blocks beyond reach.` : textDisabled}`,
        `§6${prefix}reachc§r - ${config.customcommands.reachc ? `Checks if player's attack beyond reach.` : textDisabled}`,
        `§6${prefix}noslowa§r - ${config.customcommands.noslowa ? `Checks if player's are speed hacking.` : textDisabled}`,
        `§6${prefix}flya§r - ${config.customcommands.flya ? `Checks if player's are flying in survival.` : textDisabled}`,
        `§6${prefix}illegalitemsa§r - ${config.customcommands.illegalitemsa ? `Checks if player's have illegal items in inventory.` : textDisabled}`,
        `§6${prefix}illegalitemsb§r - ${config.customcommands.illegalitemsb ? `Checks if player's use illegal items.` : textDisabled}`,
        `§6${prefix}illegalitemsc§r - ${config.customcommands.illegalitemsc ? `Checks if player's place illegal items.` : textDisabled}`,
        `§6${prefix}illegalitemsd§r - ${config.customcommands.illegalitemsd ? `Checks for illegal dropped items in the world.` : textDisabled}`,
        `§6${prefix}illegalenchant§r - ${config.customcommands.illegalenchant ? `Checks items for illegal enchants.` : textDisabled}`,
        `§6${prefix}illegallores§r - ${config.customcommands.illegallores ? `Checks for illegal lores in items.` : textDisabled}`,
        `§6${prefix}invalidsprinta§r - ${config.customcommands.invalidsprinta ? `Toggles checks for illegal sprint with blindness.` : textDisabled}`,
        `§6${prefix}stackban§r - ${config.customcommands.stackban ? `Checks if player's have illegal stacks over 64.` : textDisabled}`,
        `§6${prefix}antiscaffolda§r - ${config.customcommands.antiscaffolda ? `Checks player's for illegal scaffolding.` : textDisabled}`,
        `§6${prefix}antinukera§r - ${config.customcommands.antinukera ? `Checks player's for nuking blocks.` : textDisabled}`,
        `§6${prefix}xraya§r - ${config.customcommands.xraya ? `Notify's staff when and where player's mine specific ores.` : textDisabled}`,
        `§6${prefix}chatranks§r - ${config.customcommands.chatranks ? `Toggles chat ranks.` : textDisabled}`,
        `§6${prefix}antishulker§r - ${config.customcommands.antishulker ? `Toggles shulkers in the world.` : textDisabled}`,
        `§6${prefix}ops§r - ${config.customcommands.ops ? `Toggles One Player Sleep (OPS) for all online players.` : textDisabled}`,
        `§6${prefix}salvage§r - ${config.customcommands.salvage ? `Toggles new salvage system [Experimental].` : textDisabled}`,
        `§6${prefix}badpackets2§r - ${config.customcommands.badpackets2 ? `Toggles checks for invalid selected slots by player.` : textDisabled}`,
        `§6${prefix}clearlag§r - ${config.customcommands.clearlag ? `Clears items and entities with timer.` : textDisabled}`,
        ` `,
        `§l§6[§4Tools and Utilites§6]§r`,
        `§6${prefix}give <username> <item> <amount>§r - ${config.customcommands.give ? `Gives player items.` : textDisabled}`,
        `§6${prefix}auracheck <username>§r - ${config.customcommands.auracheck ? `Manual test for KillAura.` : textDisabled}`,
        `§6${prefix}ecwipe <username>§r - ${config.customcommands.ecwipe ? `Clears a players ender chest.` : textDisabled}`,
        `§6${prefix}fly <username>§r - ${config.customcommands.fly ? `Toggles fly mode in survival.` : textDisabled}`,
        `§6${prefix}freeze <username>§r - ${config.customcommands.freeze ? `Freeze a player and make it so they cant move.` : textDisabled}`,
        `§6${prefix}stats <username>§r - ${config.customcommands.stats ? `View a specific players anticheat logs.` : textDisabled}`,
        `§6${prefix}fullreport§r - ${config.customcommands.fullreport ? `View everyones anticheat logs.` : textDisabled}`,
        `§6${prefix}vanish§r - ${config.customcommands.vanish ? `Toggles vanish (Used for spying on suspects).` : textDisabled}`,
        `§6${prefix}chatranks§r - ${config.customcommands.chatranks ? `Toggles chat ranks.` : textDisabled}`,
        `§6${prefix}clearchat§r - ${config.customcommands.clearchat ? `Clears chat.` : textDisabled}`,
        `§6${prefix}invsee <username>§r - ${config.customcommands.invsee ? `Lists all the items in the usernames inventory.` : textDisabled}`,
        `§6${prefix}sethome <name>§r - ${config.customcommands.sethome ? `Saves current coordinates as home.` : textDisabled}`,
        `§6${prefix}gohome <name>§r - ${config.customcommands.gohome ? `Teleport back to saved home coordinates.` : textDisabled}`,
        `§6${prefix}listhome§r - ${config.customcommands.listhome ? `Shows your list of saved locations.` : textDisabled}`,
        `§6${prefix}delhome <name>§r - ${config.customcommands.delhome ? `Deletes a saved location from list.` : textDisabled}`,
        `§6${prefix}hotbar <optional>§r - ${config.customcommands.hotbar ? `Toggles hotbar message for all players. Optional: Message` : textDisabled}`,
        ` `,
        `§l§6[§4Debugging Utilites§6]§r`,
        `§6${prefix}listitems§r - ${config.debug ? `Prints every item in the game and their max stack.` : textDisabled}`,
        ` `,
        `§l§6[§4For more info execute the command with help§6]§r`,
    ]);
}
