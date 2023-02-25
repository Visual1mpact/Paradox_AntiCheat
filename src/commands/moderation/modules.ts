import { BeforeChatEvent, Player, world } from "@minecraft/server";
import config from "../../data/config.js";
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

    let player = message.sender;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // make sure the user has permissions to run the command
    if (hash === undefined || encode !== hash) {
        return sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You need to be Paradox-Opped to use this command.`);
    }

    // Check for custom prefix
    let prefix = getPrefix(player);

    // Was help requested
    let argCheck = args[0];
    if ((argCheck && args[0].toLowerCase() === "help") || !config.customcommands.modules) {
        return modulesHelp(player, prefix);
    }

    // scores
    let commandblocks = getScore("commandblocks", player);
    let cmds = getScore("cmds", player);
    let autoclicker = getScore("autoclicker", player);
    let encharmor = getScore("encharmor", player);
    let autoaura = getScore("autoaura", player);
    let antikb = getScore("antikb", player);

    // Booleans
    let worldBorderBoolean = World.getDynamicProperty("worldborder_b");
    let xrayaBoolean = World.getDynamicProperty("xraya_b");
    let opsBoolean = World.getDynamicProperty("ops_b");
    let noSlowBoolean = World.getDynamicProperty("noslowa_b");
    let nameSpoofABoolean = World.getDynamicProperty("namespoofa_b");
    let nameSpoofBBoolean = World.getDynamicProperty("namespoofb_b");
    let jesusABoolean = World.getDynamicProperty("jesusa_b");
    let InvalidSprintABoolean = World.getDynamicProperty("invalidsprinta_b");
    let illegalItemsABoolean = World.getDynamicProperty("illegalitemsa_b");
    let illegalItemsDBoolean = World.getDynamicProperty("illegalitemsd_b");
    let hotbarBoolean = World.getDynamicProperty("hotbar_b");
    let adventureGMBoolean = World.getDynamicProperty("adventuregm_b");
    let creativeGMBoolean = World.getDynamicProperty("creativegm_b");
    let survivalGMBoolean = World.getDynamicProperty("survivalgm_b");
    let flyABoolean = World.getDynamicProperty("flya_b");
    let crasherABoolean = World.getDynamicProperty("crashera_b");
    let crasherBBoolean = World.getDynamicProperty("crasherb_b");
    let bedrockValidateBoolean = World.getDynamicProperty("bedrockvalidate_b");
    let reachCBoolean = World.getDynamicProperty("reachc_b");
    let antiScaffoldABoolean = World.getDynamicProperty("antiscaffolda_b");
    let reachABoolean = World.getDynamicProperty("reacha_b");
    let illegalItemsCBoolean = World.getDynamicProperty("illegalitemsc_b");
    let reachBBoolean = World.getDynamicProperty("reachb_b");
    let antiNukerABoolean = World.getDynamicProperty("antinukera_b");
    let illegalItemsBBoolean = World.getDynamicProperty("illegalitemsb_b");
    let spammerDBoolean = World.getDynamicProperty("spammerd_b");
    let spammerCBoolean = World.getDynamicProperty("spammerc_b");
    let spammerBBoolean = World.getDynamicProperty("spammerb_b");
    let spammerABoolean = World.getDynamicProperty("spammera_b");
    let badPackets1Boolean = World.getDynamicProperty("badpackets1_b");
    let savageBoolean = World.getDynamicProperty("salvage_b");
    let illegalLoresBoolean = World.getDynamicProperty("illegallores_b");
    let illegalEnchantmentBoolean = World.getDynamicProperty("illegalenchantment_b");
    let lockdownBoolean = World.getDynamicProperty("lockdown_b");
    let antiShulkerBoolean = World.getDynamicProperty("antishulker_b");
    let chatRanksBoolean = World.getDynamicProperty("chatranks_b");
    let stackBanBoolean = World.getDynamicProperty("stackban_b");
    let badPackets2Boolean = World.getDynamicProperty("badpackets2_b");
    let antiSpamBoolean = World.getDynamicProperty("antispam_b");
    let clearLagBoolean = World.getDynamicProperty("clearlag_b");

    // Numbers
    let worldBorderOverworldNumber = World.getDynamicProperty("worldborder_n");
    let worldBorderNetherNumber = World.getDynamicProperty("worldborder_nether_n");

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
