import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
import { dynamicPropertyRegistry } from "../../penrose/worldinitializeevent/registry.js";
import { getScore, getPrefix, crypto, sendMsgToPlayer } from "../../util.js";

const World = world;

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

    // Check for hash/salt and validate password
    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
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
    const autoclicker = getScore("autoclicker", player);
    const encharmor = getScore("encharmor", player);
    const autoaura = getScore("autoaura", player);
    const antikb = getScore("antikb", player);

    // Booleans
    const worldBorderBoolean = dynamicPropertyRegistry.get("worldborder_b");
    const xrayaBoolean = dynamicPropertyRegistry.get("xraya_b");
    const opsBoolean = dynamicPropertyRegistry.get("ops_b");
    const noSlowBoolean = dynamicPropertyRegistry.get("noslowa_b");
    const nameSpoofABoolean = dynamicPropertyRegistry.get("namespoofa_b");
    const nameSpoofBBoolean = dynamicPropertyRegistry.get("namespoofb_b");
    const jesusABoolean = dynamicPropertyRegistry.get("jesusa_b");
    const InvalidSprintABoolean = World.getDynamicProperty("invalidsprinta_b");
    const illegalItemsABoolean = World.getDynamicProperty("illegalitemsa_b");
    const illegalItemsDBoolean = World.getDynamicProperty("illegalitemsd_b");
    const hotbarBoolean = dynamicPropertyRegistry.get("hotbar_b");
    const adventureGMBoolean = World.getDynamicProperty("adventuregm_b");
    const creativeGMBoolean = World.getDynamicProperty("creativegm_b");
    const survivalGMBoolean = World.getDynamicProperty("survivalgm_b");
    const flyABoolean = dynamicPropertyRegistry.get("flya_b");
    const crasherABoolean = World.getDynamicProperty("crashera_b");
    const crasherBBoolean = World.getDynamicProperty("crasherb_b");
    const bedrockValidateBoolean = World.getDynamicProperty("bedrockvalidate_b");
    const reachCBoolean = dynamicPropertyRegistry.get("reachc_b");
    const antiScaffoldABoolean = World.getDynamicProperty("antiscaffolda_b");
    const reachABoolean = dynamicPropertyRegistry.get("reacha_b");
    const illegalItemsCBoolean = World.getDynamicProperty("illegalitemsc_b");
    const reachBBoolean = dynamicPropertyRegistry.get("reachb_b");
    const antiNukerABoolean = World.getDynamicProperty("antinukera_b");
    const illegalItemsBBoolean = World.getDynamicProperty("illegalitemsb_b");
    const spammerDBoolean = World.getDynamicProperty("spammerd_b");
    const spammerCBoolean = World.getDynamicProperty("spammerc_b");
    const spammerBBoolean = World.getDynamicProperty("spammerb_b");
    const spammerABoolean = World.getDynamicProperty("spammera_b");
    const badPackets1Boolean = World.getDynamicProperty("badpackets1_b");
    const savageBoolean = dynamicPropertyRegistry.get("salvage_b");
    const illegalLoresBoolean = World.getDynamicProperty("illegallores_b");
    const illegalEnchantmentBoolean = World.getDynamicProperty("illegalenchantment_b");
    const lockdownBoolean = World.getDynamicProperty("lockdown_b");
    const antiShulkerBoolean = World.getDynamicProperty("antishulker_b");
    const chatRanksBoolean = World.getDynamicProperty("chatranks_b");
    const stackBanBoolean = World.getDynamicProperty("stackban_b");
    const badPackets2Boolean = World.getDynamicProperty("badpackets2_b");
    const antiSpamBoolean = dynamicPropertyRegistry.get("antispam_b");
    const clearLagBoolean = dynamicPropertyRegistry.get("clearlag_b");
    const antiFallABoolean = World.getDynamicProperty("antifalla_b");

    // Numbers
    const worldBorderOverworldNumber = dynamicPropertyRegistry.get("worldborder_n");
    const worldBorderNetherNumber = dynamicPropertyRegistry.get("worldborder_nether_n");

    const status = (b: string | number | boolean) => (b ? "§aENABLED" : "§4DISABLED");

    sendMsgToPlayer(player, [
        `§l§6[§4List Of Modules§6]§r`,
        `Anti-GMA: ${status(adventureGMBoolean)}`,
        `Anti-GMS: ${status(survivalGMBoolean)}`,
        `Anti-GMC: ${status(creativeGMBoolean)}`,
        `Badpackets: ${status(badPackets1Boolean)}`,
        `SpammerA: ${status(spammerABoolean)}`,
        `SpammerB: ${status(spammerBBoolean)}`,
        `SpammerC: ${status(spammerCBoolean)}`,
        `SpammerD: ${status(spammerDBoolean)}`,
        `Anti-Spam: ${status(antiSpamBoolean)}`,
        `CrasherA: ${status(crasherABoolean)}`,
        `CrasherB: ${status(crasherBBoolean)}`,
        `NamespoofA: ${status(nameSpoofABoolean)}`,
        `NamespoofB: ${status(nameSpoofBBoolean)}`,
        `Bedrock: ${status(bedrockValidateBoolean)}`,
        `ReachA: ${status(reachABoolean)}`,
        `ReachB: ${status(reachBBoolean)}`,
        `ReachC: ${status(reachCBoolean)}`,
        `JesusA: ${status(jesusABoolean)}`,
        `NoSlowA: ${status(noSlowBoolean)}`,
        `InvalidSprintA: ${status(InvalidSprintABoolean)}`,
        `FlyA: ${status(flyABoolean)}`,
        `AntiFallA: ${status(antiFallABoolean)}`,
        `IllegalItemsA: ${illegalItemsABoolean ? `§aENABLED§r [Ban Illegal Stacks ${status(stackBanBoolean)}§r]` : "§4DISABLED"}`,
        `IllegalItemsB: ${illegalItemsBBoolean ? `§aENABLED§r [Ban Illegal Stacks ${status(stackBanBoolean)}§r]` : "§4DISABLED"}`,
        `IllegalItemsC: ${illegalItemsCBoolean ? `§aENABLED§r [Ban Illegal Stacks ${status(stackBanBoolean)}§r]` : "§4DISABLED"}`,
        `IllegalItemsD: ${status(illegalItemsDBoolean)}`,
        `IllegalEnchantments: ${status(illegalEnchantmentBoolean)}`,
        `IllegalLores: ${status(illegalLoresBoolean)}`,
        `Anti-ScaffoldA: ${status(antiScaffoldABoolean)}`,
        `Anti-NukerA: ${status(antiNukerABoolean)}`,
        `XrayA: ${status(xrayaBoolean)}`,
        `Chat: ${status(chatRanksBoolean)}`,
        `Anti-Shulkers: ${status(antiShulkerBoolean)}`,
        `Hotbar: ${status(hotbarBoolean)}`,
        `OPS: ${status(opsBoolean)}`,
        `Salvage: ${status(savageBoolean)}`,
        `Lockdown: ${status(lockdownBoolean)}`,
        `Badpackets2: ${status(badPackets2Boolean)}`,
        `OverideCommandBlocksEnabled: ${status(cmds)}`,
        `RemoveCommandBlocks: ${status(commandblocks)}`,
        `Anti-Knockback: ${status(antikb)}`,
        `Autoaura: ${status(autoaura)}`,
        `Anti-Enchanted: ${status(encharmor)}`,
        `Autoclicker: ${status(autoclicker)}`,
        `World Border: ${worldBorderBoolean ? `§aENABLED§r (Overworld: ${worldBorderOverworldNumber} Nether: ${worldBorderNetherNumber})` : "§4DISABLED"}`,
        `ClearLag: ${status(clearLagBoolean)}`,
    ]);
}
