import { world, DynamicPropertiesDefinition, MinecraftEntityTypes, WorldInitializeEvent } from "@minecraft/server";
import config from "../../data/config.js";

const World = world;

function registry(data: WorldInitializeEvent) {
    // World instance
    let property = new DynamicPropertiesDefinition();
    // Entity instance
    let personal = new DynamicPropertiesDefinition();

    /**
     * Define property first
     * Register property second
     * Set property third
     */

    // Define properties for World Border
    property.defineNumber("worldborder_n");
    property.defineNumber("worldborder_nether_n");
    property.defineBoolean("worldborder_b");

    // Define properties for xray
    property.defineBoolean("xraya_b");

    // Define properties for ops
    property.defineBoolean("ops_b");

    // Define properties for noslowa
    property.defineBoolean("noslowa_b");

    // Define properties for namespoofa
    property.defineBoolean("namespoofa_b");

    // Define properties for namespoofb
    property.defineBoolean("namespoofb_b");

    // Define properties for antikba
    property.defineBoolean("antikb_b");

    // Define properties for jesusa
    property.defineBoolean("jesusa_b");

    // Define properties for invalidsprinta
    property.defineBoolean("invalidsprinta_b");

    // Define properties for illegalitemsa
    property.defineBoolean("illegalitemsa_b");

    // Define properties for illegalitemsd
    property.defineBoolean("illegalitemsd_b");

    // Define properties for hotbar
    property.defineBoolean("hotbar_b");

    // Define properties for adventuregm
    property.defineBoolean("adventuregm_b");

    // Define properties for creativegm
    property.defineBoolean("creativegm_b");

    // Define properties for survivalgm
    property.defineBoolean("survivalgm_b");

    // Define properties for flya
    property.defineBoolean("flya_b");

    // Define properties for crashera
    property.defineBoolean("crashera_b");

    // Define properties for bedrockvalidate
    property.defineBoolean("bedrockvalidate_b");

    // Define properties for reachc
    property.defineBoolean("reachc_b");

    // Define properties for antiscaffolda
    property.defineBoolean("antiscaffolda_b");

    // Define properties for reacha
    property.defineBoolean("reacha_b");

    // Define properties for illegalitemsc
    property.defineBoolean("illegalitemsc_b");

    // Define properties for reachb
    property.defineBoolean("reachb_b");

    // Define properties for antinukera
    property.defineBoolean("antinukera_b");

    // Define properties for illegalitemsb
    property.defineBoolean("illegalitemsb_b");

    // Define properties for spammerd
    property.defineBoolean("spammerd_b");

    // Define properties for spammerc
    property.defineBoolean("spammerc_b");

    // Define properties for spammerb
    property.defineBoolean("spammerb_b");

    // Define properties for spammera
    property.defineBoolean("spammera_b");

    // Define properties for badpackets1
    property.defineBoolean("badpackets1_b");

    // Define properties for salvage
    property.defineBoolean("salvage_b");

    // Define properties for rcbr
    property.defineBoolean("rcbr_b");

    // Define properties for illegallores
    property.defineBoolean("illegallores_b");

    // Define properties for illegalenchantment
    property.defineBoolean("illegalenchantment_b");

    // Define properties for lockdown
    property.defineBoolean("lockdown_b");

    // Define properties for antishulker
    property.defineBoolean("antishulker_b");

    // Define properties for chatranks
    property.defineBoolean("chatranks_b");

    // Define properties for stackban
    property.defineBoolean("stackban_b");

    // Define properties for badpackets2
    property.defineBoolean("badpackets2_b");

    // Define properties for antispam
    property.defineBoolean("antispam_b");

    // Define properties for crasherb
    property.defineBoolean("crasherb_b");

    // Define properties for clearlag
    property.defineBoolean("clearlag_b");

    // Define properties for hash
    personal.defineString("hash", 200);

    // Define properties for hash
    personal.defineString("salt", 200);

    // Register Defined properties in world globally
    data.propertyRegistry.registerWorldDynamicProperties(property);

    // Register Defined properties in entity globally
    data.propertyRegistry.registerEntityTypeDynamicProperties(personal, MinecraftEntityTypes.player);

    // Set properties for world border
    let worldborder_n = World.getDynamicProperty("worldborder_n");
    if (worldborder_n === undefined) {
        World.setDynamicProperty("worldborder_n", config.modules.worldBorder.overworld);
    }
    let worldborderNether_n = World.getDynamicProperty("worldborder_nether_n");
    if (worldborderNether_n === undefined) {
        World.setDynamicProperty("worldborder_nether_n", config.modules.worldBorder.nether);
    }
    let worldborder_b = World.getDynamicProperty("worldborder_b");
    if (worldborder_b === undefined) {
        World.setDynamicProperty("worldborder_b", config.modules.worldBorder.enabled);
    }

    // Set properties for xray
    let xraya_b = World.getDynamicProperty("xraya_b");
    if (xraya_b === undefined) {
        World.setDynamicProperty("xraya_b", config.modules.xrayA.enabled);
    }

    // Set properties for ops
    let ops_b = World.getDynamicProperty("ops_b");
    if (ops_b === undefined) {
        World.setDynamicProperty("ops_b", config.modules.ops.enabled);
    }

    // Set properties for noslowa
    let noslowa_b = World.getDynamicProperty("noslowa_b");
    if (noslowa_b === undefined) {
        World.setDynamicProperty("noslowa_b", config.modules.noslowA.enabled);
    }

    // Set properties for namespoofa
    let namespoofa_b = World.getDynamicProperty("namespoofa_b");
    if (namespoofa_b === undefined) {
        World.setDynamicProperty("namespoofa_b", config.modules.namespoofA.enabled);
    }

    // Set properties for namespoofb
    let namespoofb_b = World.getDynamicProperty("namespoofb_b");
    if (namespoofb_b === undefined) {
        World.setDynamicProperty("namespoofb_b", config.modules.namespoofB.enabled);
    }

    // Set properties for antikba
    let antikb_b = World.getDynamicProperty("antikb_b");
    if (antikb_b === undefined) {
        World.setDynamicProperty("antikb_b", config.modules.antikbA.enabled);
    }

    // Set properties for jesusa
    let jesusa_b = World.getDynamicProperty("jesusa_b");
    if (jesusa_b === undefined) {
        World.setDynamicProperty("jesusa_b", config.modules.jesusA.enabled);
    }

    // Set properties for invalidsprinta
    let invalidsprinta_b = World.getDynamicProperty("invalidsprinta_b");
    if (invalidsprinta_b === undefined) {
        World.setDynamicProperty("invalidsprinta_b", config.modules.invalidsprintA.enabled);
    }

    // Set properties for illegalitemsa
    let illegalitemsa_b = World.getDynamicProperty("illegalitemsa_b");
    if (illegalitemsa_b === undefined) {
        World.setDynamicProperty("illegalitemsa_b", config.modules.illegalitemsA.enabled);
    }

    // Set properties for illegalitemsd
    let illegalitemsd_b = World.getDynamicProperty("illegalitemsd_b");
    if (illegalitemsd_b === undefined) {
        World.setDynamicProperty("illegalitemsd_b", config.modules.illegalitemsD.enabled);
    }

    // Set properties for hotbar
    let hotbar_b = World.getDynamicProperty("hotbar_b");
    if (hotbar_b === undefined) {
        World.setDynamicProperty("hotbar_b", config.modules.hotbar.enabled);
    }

    // Set properties for adventuregm
    let adventuregm_b = World.getDynamicProperty("adventuregm_b");
    if (adventuregm_b === undefined) {
        World.setDynamicProperty("adventuregm_b", config.modules.adventureGM.enabled);
    }

    // Set properties for creativegm
    let creativegm_b = World.getDynamicProperty("creativegm_b");
    if (creativegm_b === undefined) {
        World.setDynamicProperty("creativegm_b", config.modules.creativeGM.enabled);
    }

    // Set properties for survivalgm
    let survivalgm_b = World.getDynamicProperty("survivalgm_b");
    if (survivalgm_b === undefined) {
        World.setDynamicProperty("survivalgm_b", config.modules.survivalGM.enabled);
    }

    // Set properties for flya
    let flya_b = World.getDynamicProperty("flya_b");
    if (flya_b === undefined) {
        World.setDynamicProperty("flya_b", config.modules.flyA.enabled);
    }

    // Set properties for crashera
    let crashera_b = World.getDynamicProperty("crashera_b");
    if (crashera_b === undefined) {
        World.setDynamicProperty("crashera_b", config.modules.crasherA.enabled);
    }

    // Set properties for bedrockvalidate
    let bedrockvalidate_b = World.getDynamicProperty("bedrockvalidate_b");
    if (bedrockvalidate_b === undefined) {
        World.setDynamicProperty("bedrockvalidate_b", config.modules.bedrockValidate.enabled);
    }

    // Set properties for reachc
    let reachc_b = World.getDynamicProperty("reachc_b");
    if (reachc_b === undefined) {
        World.setDynamicProperty("reachc_b", config.modules.reachC.enabled);
    }

    // Set properties for antiscaffolda
    let antiscaffolda_b = World.getDynamicProperty("antiscaffolda_b");
    if (antiscaffolda_b === undefined) {
        World.setDynamicProperty("antiscaffolda_b", config.modules.antiscaffoldA.enabled);
    }

    // Set properties for reacha
    let reacha_b = World.getDynamicProperty("reacha_b");
    if (reacha_b === undefined) {
        World.setDynamicProperty("reacha_b", config.modules.reachA.enabled);
    }

    // Set properties for illegalitemsc
    let illegalitemsc_b = World.getDynamicProperty("illegalitemsc_b");
    if (illegalitemsc_b === undefined) {
        World.setDynamicProperty("illegalitemsc_b", config.modules.illegalitemsC.enabled);
    }

    // Set properties for reachb
    let reachb_b = World.getDynamicProperty("reachb_b");
    if (reachb_b === undefined) {
        World.setDynamicProperty("reachb_b", config.modules.reachB.enabled);
    }

    // Set properties for antinukera
    let antinukera_b = World.getDynamicProperty("antinukera_b");
    if (antinukera_b === undefined) {
        World.setDynamicProperty("antinukera_b", config.modules.antinukerA.enabled);
    }

    // Set properties for illegalitemsb
    let illegalitemsb_b = World.getDynamicProperty("illegalitemsb_b");
    if (illegalitemsb_b === undefined) {
        World.setDynamicProperty("illegalitemsb_b", config.modules.illegalitemsB.enabled);
    }

    // Set properties for spammerd
    let spammerd_b = World.getDynamicProperty("spammerd_b");
    if (spammerd_b === undefined) {
        World.setDynamicProperty("spammerd_b", config.modules.spammerD.enabled);
    }

    // Set properties for spammerc
    let spammerc_b = World.getDynamicProperty("spammerc_b");
    if (spammerc_b === undefined) {
        World.setDynamicProperty("spammerc_b", config.modules.spammerC.enabled);
    }

    // Set properties for spammerb
    let spammerb_b = World.getDynamicProperty("spammerb_b");
    if (spammerb_b === undefined) {
        World.setDynamicProperty("spammerb_b", config.modules.spammerB.enabled);
    }

    // Set properties for spammera
    let spammera_b = World.getDynamicProperty("spammera_b");
    if (spammera_b === undefined) {
        World.setDynamicProperty("spammera_b", config.modules.spammerA.enabled);
    }

    // Set properties for badpackets1
    let badpackets1_b = World.getDynamicProperty("badpackets1_b");
    if (badpackets1_b === undefined) {
        World.setDynamicProperty("badpackets1_b", config.modules.badpackets1.enabled);
    }

    // Set properties for salvage
    let salvage_b = World.getDynamicProperty("salvage_b");
    if (salvage_b === undefined) {
        World.setDynamicProperty("salvage_b", config.modules.salvage.enabled);
    }

    // Set properties for illegallores
    let illegallores_b = World.getDynamicProperty("illegallores_b");
    if (illegallores_b === undefined) {
        World.setDynamicProperty("illegallores_b", config.modules.illegalLores.enabled);
    }

    // Set properties for illegalenchantment
    let illegalenchantment_b = World.getDynamicProperty("illegalenchantment_b");
    if (illegalenchantment_b === undefined) {
        World.setDynamicProperty("illegalenchantment_b", config.modules.illegalEnchantment.enabled);
    }

    // Set properties for lockdown
    let lockdown_b = World.getDynamicProperty("lockdown_b");
    if (lockdown_b === undefined) {
        World.setDynamicProperty("lockdown_b", config.modules.lockDown.enabled);
    }

    // Set properties for antishulker
    let antishulker_b = World.getDynamicProperty("antishulker_b");
    if (antishulker_b === undefined) {
        World.setDynamicProperty("antishulker_b", config.modules.antishulker.enabled);
    }

    // Set properties for chatranks
    let chatranks_b = World.getDynamicProperty("chatranks_b");
    if (chatranks_b === undefined) {
        World.setDynamicProperty("chatranks_b", config.modules.chatranks.enabled);
    }

    // Set properties for stackban
    let stackban_b = World.getDynamicProperty("stackban_b");
    if (stackban_b === undefined) {
        World.setDynamicProperty("stackban_b", config.modules.stackBan.enabled);
    }

    // Set properties for stackban
    let badpackets2_b = World.getDynamicProperty("badpackets2_b");
    if (badpackets2_b === undefined) {
        World.setDynamicProperty("badpackets2_b", config.modules.badpackets2.enabled);
    }

    // Set properties for antispam
    let antispam_b = World.getDynamicProperty("antispam_b");
    if (antispam_b === undefined) {
        World.setDynamicProperty("antispam_b", config.modules.antispam.enabled);
    }

    // Set properties for crasherb
    let crasherb_b = World.getDynamicProperty("crasherb_b");
    if (crasherb_b === undefined) {
        World.setDynamicProperty("crasherb_b", config.modules.crasherB.enabled);
    }

    // Set properties for clearlag
    let clearlag_b = World.getDynamicProperty("clearlag_b");
    if (clearlag_b === undefined) {
        World.setDynamicProperty("clearlag_b", config.modules.clearLag.enabled);
    }
}

const Registry = () => {
    World.events.worldInitialize.subscribe((data) => registry(data));
};

export { Registry };
