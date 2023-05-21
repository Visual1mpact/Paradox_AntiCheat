import { BeforeChatEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { getScore, getPrefix, sendMsgToPlayer } from "../../util.js";

function modulesHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.modules) {
        commandStatus = "§6[§4DISABLED§6]§r";
    } else {
        commandStatus = "§6[§aENABLED§6]§r";
    }
    return sendMsgToPlayer(player, [
        `\n§4[§6Command§4]§r: modules`,
        `§4[§6Status§4]§r: ${commandStatus}`,
        `§4[§6Usage§4]§r: modules [optional]`,
        `§4[§6Optional§4]§r: help`,
        `§4[§6Description§4]§r: Shows a list of modules that are enabled and disabled in Paradox.`,
        `§4[§6Examples§4]§r:`,
        `    ${prefix}modules`,
        `    ${prefix}modules help`,
    ]);
}

/**
 * @name module
 * @param {BeforeChatEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function modules(message: BeforeChatEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/modules.js:28)");
    }

    message.cancel = true;

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    const prefix = getPrefix(player);

    // Was help requested
    const argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.modules) {
        return modulesHelp(player, prefix);
    }

    // scores
    const commandblocks = getScore("commandblocks", player);
    const cmds = getScore("cmds", player);
    const encharmor = getScore("encharmor", player);
    const antikb = getScore("antikb", player);

    // Booleans
    const worldBorderBoolean = dynamicPropertyRegistry.get("worldborder_b");
    const xrayaBoolean = dynamicPropertyRegistry.get("xraya_b");
    const opsBoolean = dynamicPropertyRegistry.get("ops_b");
    const noSlowBoolean = dynamicPropertyRegistry.get("noslowa_b");
    const nameSpoofABoolean = dynamicPropertyRegistry.get("namespoofa_b");
    const nameSpoofBBoolean = dynamicPropertyRegistry.get("namespoofb_b");
    const jesusABoolean = dynamicPropertyRegistry.get("jesusa_b");
    const InvalidSprintABoolean = dynamicPropertyRegistry.get("invalidsprinta_b");
    const illegalItemsABoolean = dynamicPropertyRegistry.get("illegalitemsa_b");
    const illegalItemsCBoolean = dynamicPropertyRegistry.get("illegalitemsc_b");
    const hotbarBoolean = dynamicPropertyRegistry.get("hotbar_b");
    const adventureGMBoolean = dynamicPropertyRegistry.get("adventuregm_b");
    const creativeGMBoolean = dynamicPropertyRegistry.get("creativegm_b");
    const survivalGMBoolean = dynamicPropertyRegistry.get("survivalgm_b");
    const flyABoolean = dynamicPropertyRegistry.get("flya_b");
    const crasherABoolean = dynamicPropertyRegistry.get("crashera_b");
    const bedrockValidateBoolean = dynamicPropertyRegistry.get("bedrockvalidate_b");
    const reachBBoolean = dynamicPropertyRegistry.get("reachb_b");
    const antiScaffoldABoolean = dynamicPropertyRegistry.get("antiscaffolda_b");
    const reachABoolean = dynamicPropertyRegistry.get("reacha_b");
    const illegalItemsBBoolean = dynamicPropertyRegistry.get("illegalitemsb_b");
    const antiNukerABoolean = dynamicPropertyRegistry.get("antinukera_b");
    const spammerCBoolean = dynamicPropertyRegistry.get("spammerc_b");
    const spammerBBoolean = dynamicPropertyRegistry.get("spammerb_b");
    const spammerABoolean = dynamicPropertyRegistry.get("spammera_b");
    const badPackets1Boolean = dynamicPropertyRegistry.get("badpackets1_b");
    const savageBoolean = dynamicPropertyRegistry.get("salvage_b");
    const illegalLoresBoolean = dynamicPropertyRegistry.get("illegallores_b");
    const illegalEnchantmentBoolean = dynamicPropertyRegistry.get("illegalenchantment_b");
    const lockdownBoolean = dynamicPropertyRegistry.get("lockdown_b");
    const antiShulkerBoolean = dynamicPropertyRegistry.get("antishulker_b");
    const chatRanksBoolean = dynamicPropertyRegistry.get("chatranks_b");
    const stackBanBoolean = dynamicPropertyRegistry.get("stackban_b");
    const badPackets2Boolean = dynamicPropertyRegistry.get("badpackets2_b");
    const antiSpamBoolean = dynamicPropertyRegistry.get("antispam_b");
    const clearLagBoolean = dynamicPropertyRegistry.get("clearlag_b");
    const antiFallABoolean = dynamicPropertyRegistry.get("antifalla_b");
    const showrulesBoolean = dynamicPropertyRegistry.get("showrules_b");
    const autobanBoolean = dynamicPropertyRegistry.get("autoban_b");
    const autoclickerBoolean = dynamicPropertyRegistry.get("autoclicker_b");
    const antiKillAuraBoolean = dynamicPropertyRegistry.get("antikillaura_b");

    // Numbers
    const worldBorderOverworldNumber = dynamicPropertyRegistry.get("worldborder_n");
    const worldBorderNetherNumber = dynamicPropertyRegistry.get("worldborder_nether_n");

    const status = (b: string | number | boolean) => (b ? "§aENABLED" : "§4DISABLED");

    sendMsgToPlayer(player, [
        `§r§4[§6Paradox§4]§r List Of Modules:`,
        `§6|§r Anti-GMA: ${status(adventureGMBoolean)}`,
        `§6|§r Anti-GMS: ${status(survivalGMBoolean)}`,
        `§6|§r Anti-GMC: ${status(creativeGMBoolean)}`,
        `§6|§r Badpackets: ${status(badPackets1Boolean)}`,
        `§6|§r SpammerA: ${status(spammerABoolean)}`,
        `§6|§r SpammerB: ${status(spammerBBoolean)}`,
        `§6|§r SpammerC: ${status(spammerCBoolean)}`,
        `§6|§r Anti-Spam: ${status(antiSpamBoolean)}`,
        `§6|§r CrasherA: ${status(crasherABoolean)}`,
        `§6|§r NamespoofA: ${status(nameSpoofABoolean)}`,
        `§6|§r NamespoofB: ${status(nameSpoofBBoolean)}`,
        `§6|§r Bedrock: ${status(bedrockValidateBoolean)}`,
        `§6|§r ReachA: ${status(reachABoolean)}`,
        `§6|§r ReachB: ${status(reachBBoolean)}`,
        `§6|§r JesusA: ${status(jesusABoolean)}`,
        `§6|§r NoSlowA: ${status(noSlowBoolean)}`,
        `§6|§r InvalidSprintA: ${status(InvalidSprintABoolean)}`,
        `§6|§r FlyA: ${status(flyABoolean)}`,
        `§6|§r AntiFallA: ${status(antiFallABoolean)}`,
        `§6|§r IllegalItemsA: ${illegalItemsABoolean ? `§aENABLED§r [Ban Illegal Stacks: ${status(stackBanBoolean)}§r]` : "§4DISABLED"}`,
        `§6|§r IllegalItemsB: ${illegalItemsBBoolean ? `§aENABLED§r [Ban Illegal Stacks: ${status(stackBanBoolean)}§r]` : "§4DISABLED"}`,
        `§6|§r IllegalItemsC: ${status(illegalItemsCBoolean)}`,
        `§6|§r IllegalEnchantments: ${status(illegalEnchantmentBoolean)}`,
        `§6|§r IllegalLores: ${status(illegalLoresBoolean)}`,
        `§6|§r Anti-ScaffoldA: ${status(antiScaffoldABoolean)}`,
        `§6|§r Anti-NukerA: ${status(antiNukerABoolean)}`,
        `§6|§r XrayA: ${status(xrayaBoolean)}`,
        `§6|§r Chat: ${status(chatRanksBoolean)}`,
        `§6|§r Anti-Shulkers: ${status(antiShulkerBoolean)}`,
        `§6|§r Hotbar: ${status(hotbarBoolean)}`,
        `§6|§r OPS: ${status(opsBoolean)}`,
        `§6|§r Salvage: ${status(savageBoolean)}`,
        `§6|§r Lockdown: ${status(lockdownBoolean)}`,
        `§6|§r Badpackets2: ${status(badPackets2Boolean)}`,
        `§6|§r OverideCommandBlocksEnabled: ${status(cmds)}`,
        `§6|§r RemoveCommandBlocks: ${status(commandblocks)}`,
        `§6|§r Anti-Knockback: ${status(antikb)}`,
        `§6|§r Anti-KillAura: ${status(antiKillAuraBoolean)}`,
        `§6|§r Anti-Enchanted: ${status(encharmor)}`,
        `§6|§r Autoclicker: ${status(autoclickerBoolean)}`,
        `§6|§r World Border: ${worldBorderBoolean ? `§aENABLED§r (Overworld: §6${worldBorderOverworldNumber}§r Nether: §6${worldBorderNetherNumber}§r)` : "§4DISABLED"}`,
        `§6|§r ClearLag: ${status(clearLagBoolean)}`,
        `§6|§r ShowRules: ${status(showrulesBoolean)}`,
        `§6|§r AutoBan: ${status(autobanBoolean)}`,
    ]);
}
