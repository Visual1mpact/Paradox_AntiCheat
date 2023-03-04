import { world, DynamicPropertiesDefinition, MinecraftEntityTypes, WorldInitializeEvent } from "@minecraft/server";
import config from "../../data/config.js";

const World = world;

export const dynamicPropertyRegistry = new Map();

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

    // Boolean properties
    const defineBooleanProperties = [
        "ops_b",
        "flya_b",
        "xraya_b",
        "antikb_b",
        "hotbar_b",
        "jesusa_b",
        "reacha_b",
        "reachb_b",
        "reachc_b",
        "noslowa_b",
        "salvage_b",
        "antispam_b",
        "clearlag_b",
        "crashera_b",
        "crasherb_b",
        "lockdown_b",
        "spammera_b",
        "spammerb_b",
        "spammerc_b",
        "spammerd_b",
        "stackban_b",
        "antifalla_b",
        "chatranks_b",
        "antinukera_b",
        "creativegm_b",
        "namespoofa_b",
        "namespoofb_b",
        "survivalgm_b",
        "adventuregm_b",
        "antishulker_b",
        "badpackets1_b",
        "badpackets2_b",
        "worldborder_b",
        "illegallores_b",
        "antiscaffolda_b",
        "illegalitemsa_b",
        "illegalitemsb_b",
        "illegalitemsc_b",
        "illegalitemsd_b",
        "invalidsprinta_b",
        "bedrockvalidate_b",
        "illegalenchantment_b",
    ];

    // String properties
    const defineStringProperties = ["hash", "salt"];

    // Number properties
    const defineNumberProperties = ["worldborder_n", "worldborder_nether_n"];

    // Define booleans (property)
    for (let b = 0; b < defineBooleanProperties.length; b++) {
        property.defineBoolean(defineBooleanProperties[b]);
    }

    // Define strings (personal)
    for (let s = 0; s < defineStringProperties.length; s++) {
        personal.defineString(defineStringProperties[s], 50);
    }

    // Define numbers (property)
    for (let n = 0; n < defineNumberProperties.length; n++) {
        property.defineBoolean(defineNumberProperties[n]);
    }

    // Register Defined properties in world globally
    data.propertyRegistry.registerWorldDynamicProperties(property);

    // Register Defined properties in entity globally
    data.propertyRegistry.registerEntityTypeDynamicProperties(personal, MinecraftEntityTypes.player);

    // Conditionally set properties for Booleans
    for (const configProperties in config.modules) {
        // Loop through the identifiers in the array
        defineBooleanProperties.forEach((booleanProps) => {
            // Verify if identifier matches the module property in config
            if (booleanProps.replaceAll(/(_b)/g, "") === configProperties.toLowerCase()) {
                // Loop through the settings of each property in module
                for (const setting in config.modules[configProperties]) {
                    // If a match then set the dynamic property
                    if (setting === "enabled") {
                        // We condtionally test if the dynamic property already exists
                        const test = World.getDynamicProperty(booleanProps);
                        if (test === undefined) {
                            // Dynamic property doesn't exist so we create it with the default settings in config
                            World.setDynamicProperty(booleanProps, config.modules[configProperties][setting]);
                            // Set property with value as an element that we can use in other scripts
                            dynamicPropertyRegistry.set(booleanProps, config.modules[configProperties][setting]);
                        } else {
                            // Dynamic property exists so set property with value as an element that we can use in other scripts
                            dynamicPropertyRegistry.set(booleanProps, test);
                        }
                    }
                }
            }
        });
    }

    // Set additional properties for world border
    let worldborder_n = World.getDynamicProperty("worldborder_n");
    if (worldborder_n === undefined) {
        World.setDynamicProperty("worldborder_n", config.modules.worldBorder.overworld);
        dynamicPropertyRegistry.set("worldborder_n", config.modules.worldBorder.overworld);
    } else {
        dynamicPropertyRegistry.set("worldborder_n", worldborder_n);
    }
    let worldborderNether_n = World.getDynamicProperty("worldborder_nether_n");
    if (worldborderNether_n === undefined) {
        World.setDynamicProperty("worldborder_nether_n", config.modules.worldBorder.nether);
        dynamicPropertyRegistry.set("worldborder_nether_n", config.modules.worldBorder.nether);
    } else {
        dynamicPropertyRegistry.set("worldborder_nether_n", worldborderNether_n);
    }
}

const Registry = () => {
    World.events.worldInitialize.subscribe((data) => registry(data));
};

export { Registry };
