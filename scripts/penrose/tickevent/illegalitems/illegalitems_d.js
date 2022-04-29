import { EntityQueryOptions, world } from "mojang-minecraft";
import config from "../../../data/config.js";
import { illegalitems } from "../../../data/itemban.js";

const World = world;

function illegalitemsd() {
    // Unsubscribe if disabled in-game
    if (config.modules.illegalitemsD.enabled === false) {
        World.events.tick.unsubscribe(illegalitemsd);
        return;
    }
    let filter = new EntityQueryOptions();
    filter.type = "item"
    for (let entity of World.getDimension('overworld').getEntities(filter)) {
        if (entity.id === "minecraft:item") {
            let itemName = entity.getComponent('item').itemStack;
            // If shulker boxes are not allowed in the server then we handle this here
            if (config.modules.antishulker.enabled && (itemName.id === "minecraft:shulker_box" || itemName.id === "minecraft:undyed_shulker_box")) {
                entity.kill();
                continue;
            }
            // If it is an illegal item then remove it
            if (illegalitems.includes(itemName.id)) {
                entity.kill();
                continue;
            }
            // If it is an illegal stack then remove it
            if (itemName.amount > config.modules.illegalitemsD.maxStack) {
                entity.kill();
                continue;
            }
        }
    }
}

const IllegalItemsD = () => {
    World.events.tick.subscribe(() => illegalitemsd());
};

export { IllegalItemsD };