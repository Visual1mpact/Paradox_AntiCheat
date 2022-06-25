import { EntityQueryOptions, world } from "mojang-minecraft";
import config from "../../../data/config.js";
import { illegalitems } from "../../../data/itemban.js";
import maxItemStack, { defaultMaxItemStack } from "../../../data/maxstack.js";

const World = world;

function illegalitemsd() {
    // Get Dynamic Property
    let illegalItemsDBoolean = World.getDynamicProperty('illegalitemsd_b');
    if (illegalItemsDBoolean === undefined) {
        illegalItemsDBoolean = config.modules.illegalitemsD.enabled;
    }
    let antiShulkerBoolean = World.getDynamicProperty('antishulker_b');
    if (antiShulkerBoolean === undefined) {
        antiShulkerBoolean = config.modules.antishulker.enabled;
    }
    // Unsubscribe if disabled in-game
    if (illegalItemsDBoolean === false) {
        World.events.tick.unsubscribe(illegalitemsd);
        return;
    }
    let filter = new EntityQueryOptions();
    filter.type = "item";
    for (let entity of World.getDimension('overworld').getEntities(filter)) {
        // Check if entity object returns undefined and skip it
        if (entity === undefined) {
            continue;
        }

        let itemName;
        // Get component of itemStack for dropped item
        try {
            itemName = entity.getComponent('item').itemStack;
        } catch (error) {}

        // Check if object returns undefined and skip if it does
        if (itemName === undefined) {
            continue;
        }
        if (entity.id === "minecraft:item") {

            // If shulker boxes are not allowed in the server then we handle this here
            if (antiShulkerBoolean && (itemName.id === "minecraft:shulker_box" || itemName.id === "minecraft:undyed_shulker_box")) {
                entity.kill();
                continue;
            }
            // If it is an illegal item then remove it
            if (illegalitems.includes(itemName.id)) {
                entity.kill();
                continue;
            }
            // If it is an illegal stack then remove it
            const maxStack = maxItemStack[itemName.id] ?? defaultMaxItemStack
            if (itemName.amount < 0 || itemName.amount > maxStack) {
                entity.kill();
                continue;
            }
        }
    }
}

const IllegalItemsD = () => {
    World.events.tick.subscribe(illegalitemsd);
};

export { IllegalItemsD };