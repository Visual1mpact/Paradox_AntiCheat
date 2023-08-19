import { ChatSendAfterEvent, Player } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/WorldInitializeAfterEvent/registry.js";
import { getScore, getPrefix, sendMsgToPlayer } from "../../util.js";

function modulesHelp(player: Player, prefix: string) {
    let commandStatus: string;
    if (!config.customcommands.modules) {
        commandStatus = "§6[§4DISABLED§6]§f";
    } else {
        commandStatus = "§6[§aENABLED§6]§f";
    }
    return sendMsgToPlayer(player, [
        `\n§o§4[§6Command§4]§f: modules`,
        `§4[§6Status§4]§f: ${commandStatus}`,
        `§4[§6Usage§4]§f: modules [optional]`,
        `§4[§6Optional§4]§f: help`,
        `§4[§6Description§4]§f: Shows a list of modules that are enabled and disabled in Paradox.`,
        `§4[§6Examples§4]§f:`,
        `    ${prefix}modules`,
        `        §4- §6Show a list of enabled and disabled modules§f`,
        `    ${prefix}modules help`,
        `        §4- §6Show command help§f`,
    ]);
}

/**
 * @name module
 * @param {ChatSendAfterEvent} message - Message object
 * @param {string[]} args - Additional arguments provided (optional).
 */
export function modules(message: ChatSendAfterEvent, args: string[]) {
    // validate that required params are defined
    if (!message) {
        return console.warn(`${new Date()} | ` + "Error: ${message} isnt defined. Did you forget to pass it? (./commands/moderation/modules.js:28)");
    }

    const player = message.sender;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

    // Make sure the user has permissions to run the command
    if (uniqueId !== player.name) {
        return sendMsgToPlayer(player, `§f§4[§6Paradox§4]§f You need to be Paradox-Opped to use this command.`);
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
    const afkBoolean = dynamicPropertyRegistry.get("afk_b");

    // Numbers
    const worldBorderOverworldNumber = dynamicPropertyRegistry.get("worldborder_n");
    const worldBorderNetherNumber = dynamicPropertyRegistry.get("worldborder_nether_n");
    const worldBorderEndNumber = dynamicPropertyRegistry.get("worldborder_end_n");

    const status = (b: string | number | boolean) => (b ? "§aENABLED" : "§4DISABLED");

    sendMsgToPlayer(player, [
        `§f§4[§6Paradox§4]§f List Of Modules:`,
        `§o§6|§f Anti-GMA: ${status(adventureGMBoolean)}`,
        `§o§6|§f Anti-GMS: ${status(survivalGMBoolean)}`,
        `§o§6|§f Anti-GMC: ${status(creativeGMBoolean)}`,
        `§o§6|§f Badpackets: ${status(badPackets1Boolean)}`,
        `§o§6|§f SpammerA: ${status(spammerABoolean)}`,
        `§o§6|§f SpammerB: ${status(spammerBBoolean)}`,
        `§o§6|§f SpammerC: ${status(spammerCBoolean)}`,
        `§o§6|§f Anti-Spam: ${status(antiSpamBoolean)}`,
        `§o§6|§f CrasherA: ${status(crasherABoolean)}`,
        `§o§6|§f NamespoofA: ${status(nameSpoofABoolean)}`,
        `§o§6|§f NamespoofB: ${status(nameSpoofBBoolean)}`,
        `§o§6|§f Bedrock: ${status(bedrockValidateBoolean)}`,
        `§o§6|§f ReachA: ${status(reachABoolean)}`,
        `§o§6|§f ReachB: ${status(reachBBoolean)}`,
        `§o§6|§f JesusA: ${status(jesusABoolean)}`,
        `§o§6|§f NoSlowA: ${status(noSlowBoolean)}`,
        `§o§6|§f InvalidSprintA: ${status(InvalidSprintABoolean)}`,
        `§o§6|§f FlyA: ${status(flyABoolean)}`,
        `§o§6|§f AntiFallA: ${status(antiFallABoolean)}`,
        `§o§6|§f IllegalItemsA: ${illegalItemsABoolean ? `§aENABLED§f [Ban Illegal Stacks: ${status(stackBanBoolean)}§f]` : "§4DISABLED"}`,
        `§o§6|§f IllegalItemsB: ${illegalItemsBBoolean ? `§aENABLED§f [Ban Illegal Stacks: ${status(stackBanBoolean)}§f]` : "§4DISABLED"}`,
        `§o§6|§f IllegalItemsC: ${status(illegalItemsCBoolean)}`,
        `§o§6|§f IllegalEnchantments: ${status(illegalEnchantmentBoolean)}`,
        `§o§6|§f IllegalLores: ${status(illegalLoresBoolean)}`,
        `§o§6|§f Anti-ScaffoldA: ${status(antiScaffoldABoolean)}`,
        `§o§6|§f Anti-NukerA: ${status(antiNukerABoolean)}`,
        `§o§6|§f XrayA: ${status(xrayaBoolean)}`,
        `§o§6|§f Chat: ${status(chatRanksBoolean)}`,
        `§o§6|§f Anti-Shulkers: ${status(antiShulkerBoolean)}`,
        `§o§6|§f Hotbar: ${status(hotbarBoolean)}`,
        `§o§6|§f OPS: ${status(opsBoolean)}`,
        `§o§6|§f Salvage: ${status(savageBoolean)}`,
        `§o§6|§f Lockdown: ${status(lockdownBoolean)}`,
        `§o§6|§f Badpackets2: ${status(badPackets2Boolean)}`,
        `§o§6|§f OverideCommandBlocksEnabled: ${status(cmds)}`,
        `§o§6|§f RemoveCommandBlocks: ${status(commandblocks)}`,
        `§o§6|§f Anti-Knockback: ${status(antikb)}`,
        `§o§6|§f Anti-KillAura: ${status(antiKillAuraBoolean)}`,
        `§o§6|§f Anti-Enchanted: ${status(encharmor)}`,
        `§o§6|§f Autoclicker: ${status(autoclickerBoolean)}`,
        `§o§6|§f World Border: ${worldBorderBoolean ? `§aENABLED§f (Overworld: §6${worldBorderOverworldNumber}§f Nether: §6${worldBorderNetherNumber}§f End: §6${worldBorderEndNumber}§f)` : "§4DISABLED"}`,
        `§o§6|§f ClearLag: ${status(clearLagBoolean)}`,
        `§o§6|§f ShowRules: ${status(showrulesBoolean)}`,
        `§o§6|§f AutoBan: ${status(autobanBoolean)}`,
        `§o§6|§f AFK: ${status(afkBoolean)}`,
    ]);
}
