import { world, DynamicPropertiesDefinition } from "mojang-minecraft";
import config from "../../data/config.js";

const World = world;

function registry(data) {
    let property = new DynamicPropertiesDefinition();

    /**
     * Define property first
     * Register property second
     * Set property third
     */

    // Define properties for World Border
    property.defineNumber('worldborder_n');
    property.defineBoolean('worldborder_b');

    // Define properties for xray
    property.defineBoolean('xraya_b');

    // Define properties for antiteleport
    property.defineBoolean('antiteleport_b');

    // Define properties for ops
    property.defineBoolean('ops_b');

    // Define properties for noslow
    property.defineBoolean('noslowa_b');

    // Define properties for namespoofa
    property.defineBoolean('namespoofa_b');

    // Define properties for namespoofb
    property.defineBoolean('namespoofb_b');
    
    // Register Defined properties in world globally
    data.propertyRegistry.registerWorldDynamicProperties(property);

    // Set properties for world border
    let worldborder_n = World.getDynamicProperty('worldborder_n');
    if (worldborder_n === undefined) {
        World.setDynamicProperty('worldborder_n', config.modules.worldBorder.bordersize);
    }
    let worldborder_b = World.getDynamicProperty('worldborder_b');
    if (worldborder_b === undefined) {
        World.setDynamicProperty('worldborder_b', config.modules.worldBorder.enabled);
    }

    // Set properties for xray
    let xraya_b = World.getDynamicProperty('xraya_b');
    if (xraya_b === undefined) {
        World.setDynamicProperty('xraya_b', config.modules.xrayA.enabled);
    }

    // Set properties for antiteleport
    let antiteleport_b = World.getDynamicProperty('antiteleport_b');
    if (antiteleport_b === undefined) {
        World.setDynamicProperty('antiteleport_b', config.modules.antiTeleport.enabled);
    }

    // Set properties for ops
    let ops_b = World.getDynamicProperty('ops_b');
    if (ops_b === undefined) {
        World.setDynamicProperty('ops_b', config.modules.ops.enabled);
    }

    // Set properties for ops
    let noslowa_b = World.getDynamicProperty('noslowa_b');
    if (noslowa_b === undefined) {
        World.setDynamicProperty('noslowa_b', config.modules.noslowA.enabled);
    }

    // Set properties for namespoofa
    let namespoofa_b = World.getDynamicProperty('namespoofa_b');
    if (namespoofa_b === undefined) {
        World.setDynamicProperty('namespoofa_b', config.modules.namespoofA.enabled);
    }

    // Set properties for namespoofb
    let namespoofb_b = World.getDynamicProperty('namespoofb_b');
    if (namespoofb_b === undefined) {
        World.setDynamicProperty('namespoofb_b', config.modules.namespoofB.enabled);
    }
}

const Registry = () => {
    World.events.worldInitialize.subscribe(data => registry(data));
};

export { Registry };
