import { world, DynamicPropertiesDefinition, MinecraftEntityTypes, WorldInitializeAfterEvent } from "@minecraft/server";
import config from "../../data/config.js";
import { UUIDManager } from "../../classes/UUIDManager.js";

export const dynamicPropertyRegistry = new Map<string, string | number | boolean>();

function registry(data: WorldInitializeAfterEvent) {
    // World instance
    const property = new DynamicPropertiesDefinition();
    // Entity instance
    const personal = new DynamicPropertiesDefinition();

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
        "speeda_b",
        "salvage_b",
        "antispam_b",
        "clearlag_b",
        "crashera_b",
        "lockdown_b",
        "spammera_b",
        "spammerb_b",
        "spammerc_b",
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
        "invalidsprinta_b",
        "bedrockvalidate_b",
        "illegalenchantment_b",
        "showrules_b",
        "kickondecline_b",
        "autoban_b",
        "autoclicker_b",
        "antikillaura_b",
        "afk_b",
        "antiphasea_b",
    ];

    // String properties
    const defineStringProperties = ["hash", "salt"];

    // Number properties
    const defineNumberProperties = ["worldborder_n", "worldborder_nether_n", "worldborder_end_n"];

    // Define booleans (property)
    const defineBooleanLength = defineBooleanProperties.length;
    for (let b = 0; b < defineBooleanLength; b++) {
        property.defineBoolean(defineBooleanProperties[b]);
    }

    // Define strings (personal)
    const defineStringLength = defineStringProperties.length;
    for (let s = 0; s < defineStringLength; s++) {
        personal.defineString(defineStringProperties[s], 50);
    }

    // Define numbers (property)
    const defineNumberLength = defineNumberProperties.length;
    for (let n = 0; n < defineNumberLength; n++) {
        property.defineNumber(defineNumberProperties[n]);
    }

    /**
     * This is global security for strings where applicable
     */
    property.defineString("crypt", 50);

    // Register Defined properties in world globally
    data.propertyRegistry.registerWorldDynamicProperties(property);

    // Register Defined properties in entity globally
    data.propertyRegistry.registerEntityTypeDynamicProperties(personal, MinecraftEntityTypes.player);

    let flag = false;
    // Loop through the identifiers in the array
    defineBooleanProperties.forEach((booleanProp) => {
        // Verify if identifier matches any module property in config
        const objectEntriesModules = Object.entries(config.modules);
        for (const [configProperty, configPropertyValue] of objectEntriesModules) {
            if (booleanProp.replaceAll(/(_b)/g, "") === configProperty.toLowerCase()) {
                // Loop through the settings of each property in module
                const objectEntriesValues = Object.entries(configPropertyValue);
                for (const [setting, settingValue] of objectEntriesValues) {
                    if (setting === "enabled") {
                        // We conditionally test if the dynamic property already exists
                        const test = world.getDynamicProperty(booleanProp);
                        if (test === undefined) {
                            // Dynamic property doesn't exist so we create it with the default settings in config
                            world.setDynamicProperty(booleanProp, settingValue);
                            // Set property with value as an element that we can use in other scripts
                            dynamicPropertyRegistry.set(booleanProp, settingValue);
                        } else {
                            // Dynamic property exists so set property with value as an element that we can use in other scripts
                            dynamicPropertyRegistry.set(booleanProp, test);
                        }
                    }
                    // If a matching boolean property is found, set the flag and break out of the loop
                    flag = true;
                    break;
                }
            }
        }
        // If no matching boolean property was found, execute the else block
        if (!flag) {
            // We conditionally test if the dynamic property already exists
            const test = world.getDynamicProperty(booleanProp);
            if (test === undefined) {
                // Dynamic property doesn't exist so we create it and disable it by default
                world.setDynamicProperty(booleanProp, false);
                // Set property with value as an element that we can use in other scripts
                dynamicPropertyRegistry.set(booleanProp, false);
            } else {
                // Dynamic property exists so set property with value as an element that we can use in other scripts
                dynamicPropertyRegistry.set(booleanProp, test);
            }
        }
        flag = false; // reset the flag for the next iteration
    });

    // Set additional properties for world border
    const worldborder_n = world.getDynamicProperty("worldborder_n");
    if (worldborder_n === undefined) {
        world.setDynamicProperty("worldborder_n", config.modules.worldBorder.overworld);
        dynamicPropertyRegistry.set("worldborder_n", config.modules.worldBorder.overworld);
    } else {
        dynamicPropertyRegistry.set("worldborder_n", worldborder_n);
    }
    const worldborderNether_n = world.getDynamicProperty("worldborder_nether_n");
    if (worldborderNether_n === undefined) {
        world.setDynamicProperty("worldborder_nether_n", config.modules.worldBorder.nether);
        dynamicPropertyRegistry.set("worldborder_nether_n", config.modules.worldBorder.nether);
    } else {
        dynamicPropertyRegistry.set("worldborder_nether_n", worldborderNether_n);
    }
    const worldborderEnd_n = world.getDynamicProperty("worldborder_end_n");
    if (worldborderEnd_n === undefined) {
        world.setDynamicProperty("worldborder_end_n", config.modules.worldBorder.end);
        dynamicPropertyRegistry.set("worldborder_end_n", config.modules.worldBorder.end);
    } else {
        dynamicPropertyRegistry.set("worldborder_end_n", worldborderEnd_n);
    }

    /**
     * This is global security for strings where applicable
     */
    const salt = world.getDynamicProperty("crypt");
    if (salt === undefined) {
        world.setDynamicProperty("crypt", UUIDManager.generateRandomUUID());
    }
}

const Registry = () => {
    world.afterEvents.worldInitialize.subscribe((data) => registry(data));
};

export { Registry };
