import { ChatSendAfterEvent } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getPrefix, sendMsgToPlayer } from "../../util.js";
import { nonstaffhelp } from "./nonstaffhelp.js";

/**
 * @name help
 * @param {ChatSendAfterEvent} message - Message object
 */
export function help(message: ChatSendAfterEvent) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/help.js:8)");
    }

    const player = message.sender;

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    // if not then show them non staff commands
    if (uniqueId !== player.name) {
        return nonstaffhelp(message);
    }

    // Make sure the help command wasn't disabled
    if (config.customcommands.help === false) {
        config.customcommands.help = true;
    }

    const textDisabled = "Command §4DISABLED§f.";

    return sendMsgToPlayer(player, [
        `§l§o§6[§4Paradox AntiCheat Command Help§6]§r§o`,
        ` `,
        `§l§o§6[§4Moderation Commands§6]§r§o`,
        `§6${prefix}help§f - Shows this help page.`,
        `§6${prefix}ban§f - ${config.customcommands.ban ? `Ban the specified user.` : textDisabled}`,
        `§6${prefix}autoban§f - ${config.customcommands.autoban ? `Will ban players automaticaly if they have a violation above 50.` : textDisabled}`,
        `§6${prefix}unban§f - ${config.customcommands.unban ? `Allows specified players to join if banned (Doesn't include global ban).` : textDisabled}`,
        `§6${prefix}kick§f - ${config.customcommands.kick ? `Kick the specified user.` : textDisabled}`,
        `§6${prefix}mute§f - ${config.customcommands.mute ? `Mute the specified user.` : textDisabled}`,
        `§6${prefix}unmute§f - ${config.customcommands.unmute ? `Unmute the specified user.` : textDisabled}`,
        `§6${prefix}notify§f - ${config.customcommands.notify ? `Toggles cheat notifications.` : textDisabled}`,
        `§6${prefix}credits§f - Shows credits, thats it.`,
        `§6${prefix}op§f - ${config.customcommands.op ? `Op's player in Paradox AntiCheat features.` : textDisabled}`,
        `§6${prefix}deop§f - ${config.customcommands.deop ? `Revokes Op player in Paradox AntiCheat features.` : textDisabled}`,
        `§6${prefix}modules§f - ${config.customcommands.modules ? `View all enabled or disabled modules.` : textDisabled}`,
        `§6${prefix}prefix§f - Change the prefix for commands. Max is two characters.`,
        `§6${prefix}prefix reset§f - Reset the prefix for commands.`,
        `§6${prefix}lockdown§f - ${config.customcommands.lockdown ? `Kicks player's from server excluding Staff for maintenance.` : textDisabled}`,
        `§6${prefix}punish§f - ${config.customcommands.punish ? `Removes all items from player's inventory and ender chest.` : textDisabled}`,
        `§6${prefix}tpa§f - ${config.customcommands.tpa ? `Teleport to a player or vice versa.` : textDisabled}`,
        `§6${prefix}despawn§f - ${config.customcommands.despawn ? `Despawns all or specified entities if they exist.` : textDisabled}`,
        ` `,
        `§l§o§6[§4Optional Features§6]§r§o`,
        `§6${prefix}allowgma§f - ${config.customcommands.allowgma ? `Toggles Gamemode 2(Adventure) to be used.` : textDisabled}`,
        `§6${prefix}allowgmc§f - ${config.customcommands.allowgmc ? `Toggles Gamemode 1(Creative) to be used.` : textDisabled}`,
        `§6${prefix}allowgms§f - ${config.customcommands.allowgms ? `Toggles Gamemode 0(Survival) to be used.` : textDisabled}`,
        `§6${prefix}removecb§f - ${config.customcommands.removecommandblocks ? `Toggles Anti Command Blocks (Clears all when enabled).` : textDisabled}`,
        `§6${prefix}bedrockvalidate§f - ${config.customcommands.bedrockvalidate ? `Checks validation of bedrock.` : textDisabled}`,
        `§6${prefix}overridecbe§f - ${config.customcommands.overidecommandblocksenabled ? `Forces the commandblocksenabled gamerule to be enabled or disabled at all times.` : textDisabled}`,
        `§6${prefix}worldborder <value>§f - ${config.customcommands.worldborder ? `Sets the World Border for Overworld, Nether or End.` : textDisabled}`,
        `§6${prefix}autoclicker§f - ${config.customcommands.autoclicker ? `Toggles Anti Autoclicker.` : textDisabled}`,
        `§6${prefix}jesusa§f - ${config.customcommands.jesusa ? `Checks if player's are walking on water and lava.` : textDisabled}`,
        `§6${prefix}enchantedarmor§f - ${config.customcommands.enchantedarmor ? `Toggles Anti Enchanted Armor for all players.` : textDisabled}`,
        `§6${prefix}antikillaura§f - ${config.customcommands.antikillaura ? `Toggles checks for attacks outside a 90 degree angle.` : textDisabled}`,
        `§6${prefix}antikb§f - ${config.customcommands.antikb ? `Toggles Anti Knockback for all players.` : textDisabled}`,
        `§6${prefix}badpackets1§f - ${config.customcommands.badpackets1 ? `Checks message length for each broadcast.` : textDisabled}`,
        `§6${prefix}spammera§f - ${config.customcommands.spammera ? `Checks if message is sent while moving.` : textDisabled}`,
        `§6${prefix}spammerb§f - ${config.customcommands.spammerb ? `Checks if message is sent while swinging.` : textDisabled}`,
        `§6${prefix}spammerc§f - ${config.customcommands.spammerc ? `Checks if message is sent while using items.` : textDisabled}`,
        `§6${prefix}antispam§f - ${config.customcommands.antispam ? `Checks for spamming in chat with 2 second cooldown.` : textDisabled}`,
        `§6${prefix}crashera§f - ${config.customcommands.crashera ? `Prevents Horion crasher.` : textDisabled}`,
        `§6${prefix}namespoofa§f - ${config.customcommands.namespoofa ? `Checks if player's name exceeds character limitations.` : textDisabled}`,
        `§6${prefix}namespoofb§f - ${config.customcommands.namespoofb ? `Checks if player's name has Non ASCII characters.` : textDisabled}`,
        `§6${prefix}reacha§f - ${config.customcommands.reacha ? `Checks if player's place blocks beyond reach.` : textDisabled}`,
        `§6${prefix}reachb§f - ${config.customcommands.reachb ? `Checks if player's attack beyond reach.` : textDisabled}`,
        `§6${prefix}noslowa§f - ${config.customcommands.noslowa ? `Checks if player's are speed hacking.` : textDisabled}`,
        `§6${prefix}flya§f - ${config.customcommands.flya ? `Checks if player's are flying in survival.` : textDisabled}`,
        `§6${prefix}illegalitemsa§f - ${config.customcommands.illegalitemsa ? `Checks if player's have illegal items in inventory.` : textDisabled}`,
        `§6${prefix}illegalitemsb§f - ${config.customcommands.illegalitemsb ? `Checks if player's place illegal items.` : textDisabled}`,
        `§6${prefix}illegalitemsc§f - ${config.customcommands.illegalitemsc ? `Checks for illegal dropped items in the world.` : textDisabled}`,
        `§6${prefix}illegalenchant§f - ${config.customcommands.illegalenchant ? `Checks items for illegal enchants.` : textDisabled}`,
        `§6${prefix}illegallores§f - ${config.customcommands.illegallores ? `Checks for illegal lores in items.` : textDisabled}`,
        `§6${prefix}invalidsprinta§f - ${config.customcommands.invalidsprinta ? `Toggles checks for illegal sprint with blindness.` : textDisabled}`,
        `§6${prefix}stackban§f - ${config.customcommands.stackban ? `Checks if player's have illegal stacks over 64.` : textDisabled}`,
        `§6${prefix}antiscaffolda§f - ${config.customcommands.antiscaffolda ? `Checks player's for illegal scaffolding.` : textDisabled}`,
        `§6${prefix}antinukera§f - ${config.customcommands.antinukera ? `Checks player's for nuking blocks.` : textDisabled}`,
        `§6${prefix}xraya§f - ${config.customcommands.xraya ? `Notify's staff when and where player's mine specific ores.` : textDisabled}`,
        `§6${prefix}chatranks§f - ${config.customcommands.chatranks ? `Toggles chat ranks.` : textDisabled}`,
        `§6${prefix}antishulker§f - ${config.customcommands.antishulker ? `Toggles shulkers in the world.` : textDisabled}`,
        `§6${prefix}ops§f - ${config.customcommands.ops ? `Toggles One Player Sleep (OPS) for all online players.` : textDisabled}`,
        `§6${prefix}salvage§f - ${config.customcommands.salvage ? `Toggles new salvage system [Experimental].` : textDisabled}`,
        `§6${prefix}badpackets2§f - ${config.customcommands.badpackets2 ? `Toggles checks for invalid selected slots by player.` : textDisabled}`,
        `§6${prefix}clearlag§f - ${config.customcommands.clearlag ? `Clears items and entities with timer.` : textDisabled}`,
        `§6${prefix}antifalla§f - ${config.customcommands.antifalla ? `Toggles checks for taking no fall damage in survival.` : textDisabled}`,
        `§6${prefix}showrules§f - ${config.customcommands.showrules ? `Toggles showing the rules when the player loads in for the first time.` : textDisabled}`,
        `§6${prefix}afk§f - ${config.customcommands.afk ? `Kicks players that are AFK for ${config.modules.afk.minutes} minutes.` : textDisabled}`,
        `§6${prefix}antiphasea§f - ${config.customcommands.antiphasea ? `Toggles checks for players phasing through blocks.` : textDisabled}`,
        ` `,
        `§l§o§6[§4Tools and Utilites§6]§r§o`,
        `§6${prefix}give§f - ${config.customcommands.give ? `Gives player items.` : textDisabled}`,
        `§6${prefix}ecwipe§f - ${config.customcommands.ecwipe ? `Clears a players ender chest.` : textDisabled}`,
        `§6${prefix}fly§f - ${config.customcommands.fly ? `Toggles fly mode in survival.` : textDisabled}`,
        `§6${prefix}freeze§f - ${config.customcommands.freeze ? `Freeze a player and make it so they cant move.` : textDisabled}`,
        `§6${prefix}stats§f - ${config.customcommands.stats ? `View a specific players anticheat logs.` : textDisabled}`,
        `§6${prefix}fullreport§f - ${config.customcommands.fullreport ? `View everyones anticheat logs.` : textDisabled}`,
        `§6${prefix}vanish§f - ${config.customcommands.vanish ? `Toggles vanish (Used for spying on suspects).` : textDisabled}`,
        `§6${prefix}chatranks§f - ${config.customcommands.chatranks ? `Toggles chat ranks.` : textDisabled}`,
        `§6${prefix}clearchat§f - ${config.customcommands.clearchat ? `Clears chat.` : textDisabled}`,
        `§6${prefix}invsee§f - ${config.customcommands.invsee ? `Lists all the items in the usernames inventory.` : textDisabled}`,
        `§6${prefix}sethome§f - ${config.customcommands.sethome ? `Saves current coordinates as home.` : textDisabled}`,
        `§6${prefix}gohome§f - ${config.customcommands.gohome ? `Teleport back to saved home coordinates.` : textDisabled}`,
        `§6${prefix}listhome§f - ${config.customcommands.listhome ? `Shows your list of saved locations.` : textDisabled}`,
        `§6${prefix}delhome§f - ${config.customcommands.delhome ? `Deletes a saved location from list.` : textDisabled}`,
        `§6${prefix}hotbar§f - ${config.customcommands.hotbar ? `Toggles hotbar message for all players. Optional: Message` : textDisabled}`,
        `§6${prefix}paradoxui§f - ${config.customcommands.paradoxiu ? `Shows GUI for main menu.` : textDisabled}`,
        `§6${prefix}tpr§f - ${config.customcommands.tpr ? `Will send requests to tp to players.` : textDisabled}`,
        `§6${prefix}biome§f - ${config.customcommands.biome ? `Sends the current biome and direction the player is facing.` : textDisabled}`,
        `§6${prefix}tag§f - ${config.customcommands.tag ? `Gives one or more ranks to a specified player or resets it.` : textDisabled}`,
        `§6${prefix}version§f - Will print to chat the currently installed version of paradox.`,
        ` `,
        `§l§o§6[§4Debugging Utilites§6]§r§o`,
        `§6${prefix}listitems§f - ${config.debug ? `Prints every item in the game and their max stack.` : textDisabled}`,
        ` `,
        `§l§o§6[§4For more info execute the command with help§6]§f`,
    ]);
}
