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

    // Define properties for noslowa
    property.defineBoolean('noslowa_b');

    // Define properties for namespoofa
    property.defineBoolean('namespoofa_b');

    // Define properties for namespoofb
    property.defineBoolean('namespoofb_b');

    // Define properties for antikba
    property.defineBoolean('antikb_b');

    // Define properties for jesusa
    property.defineBoolean('jesusa_b');

    // Define properties for invalidsprinta
    property.defineBoolean('invalidsprinta_b');

    // Define properties for illegalitemsa
    property.defineBoolean('illegalitemsa_b');

    // Define properties for illegalitemsd
    property.defineBoolean('illegalitemsd_b');

    // Define properties for hotbar
    property.defineBoolean('hotbar_b');

    // Define properties for adventuregm
    property.defineBoolean('adventuregm_b');

    // Define properties for creativegm
    property.defineBoolean('creativegm_b');

    // Define properties for survivalgm
    property.defineBoolean('survivalgm_b');
    
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

    // Set properties for noslowa
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

    // Set properties for antikba
    let antikb_b = World.getDynamicProperty('antikb_b');
    if (antikb_b === undefined) {
        World.setDynamicProperty('antikb_b', config.modules.antikbA.enabled);
    }

    // Set properties for jesusa
    let jesusa_b = World.getDynamicProperty('jesusa_b');
    if (jesusa_b === undefined) {
        World.setDynamicProperty('jesusa_b', config.modules.jesusA.enabled);
    }

    // Set properties for invalidsprinta
    let invalidsprinta_b = World.getDynamicProperty('invalidsprinta_b');
    if (invalidsprinta_b === undefined) {
        World.setDynamicProperty('invalidsprinta_b', config.modules.invalidsprintA.enabled);
    }

    // Set properties for illegalitemsa
    let illegalitemsa_b = World.getDynamicProperty('illegalitemsa_b');
    if (illegalitemsa_b === undefined) {
        World.setDynamicProperty('illegalitemsa_b', config.modules.illegalitemsA.enabled);
    }

    // Set properties for illegalitemsd
    let illegalitemsd_b = World.getDynamicProperty('illegalitemsd_b');
    if (illegalitemsd_b === undefined) {
        World.setDynamicProperty('illegalitemsd_b', config.modules.illegalitemsD.enabled);
    }

    // Set properties for hotbar
    let hotbar_b = World.getDynamicProperty('hotbar_b');
    if (hotbar_b === undefined) {
        World.setDynamicProperty('hotbar_b', config.modules.hotbar.enabled);
    }

    // Set properties for adventuregm
    let adventuregm_b = World.getDynamicProperty('adventuregm_b');
    if (adventuregm_b === undefined) {
        World.setDynamicProperty('adventuregm_b', config.modules.adventureGM.enabled);
    }

    // Set properties for creativegm
    let creativegm_b = World.getDynamicProperty('creativegm_b');
    if (creativegm_b === undefined) {
        World.setDynamicProperty('creativegm_b', config.modules.creativeGM.enabled);
    }

    // Set properties for survivalgm
    let survivalgm_b = World.getDynamicProperty('survivalgm_b');
    if (survivalgm_b === undefined) {
        World.setDynamicProperty('survivalgm_b', config.modules.survivalGM.enabled);
    }
}

const Registry = () => {
    World.events.worldInitialize.subscribe(data => registry(data));
};

export { Registry };
