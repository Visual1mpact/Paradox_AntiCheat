import { EntityItemComponent, EntityQueryOptions, ItemStack, world, system } from "@minecraft/server";
import { illegalitems } from "../../../data/itemban.js";
import maxItemStack, { defaultMaxItemStack } from "../../../data/maxstack.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

function illegalitemsc(id: number) {
    // Get Dynamic Property
    const illegalItemsCBoolean = dynamicPropertyRegistry.get("illegalitemsc_b");
    const antiShulkerBoolean = dynamicPropertyRegistry.get("antishulker_b");

    // Unsubscribe if disabled in-game
    if (illegalItemsCBoolean === false) {
        system.clearRun(id);
        return;
    }
    const filter = new Object() as EntityQueryOptions;
    filter.type = "item";
    for (const entity of world.getDimension("overworld").getEntities(filter)) {
        // Check if entity object returns undefined and skip it
        if (entity === undefined) {
            continue;
        }

        let itemName: ItemStack;
        // Get component of itemStack for dropped item
        try {
            const itemContainer = entity.getComponent("item") as unknown as EntityItemComponent;
            itemName = itemContainer.itemStack;
        } catch (error) {}

        // Check if object returns undefined and skip if it does
        if (itemName === undefined) {
            continue;
        }
        if (entity.id === "minecraft:item") {
            // If shulker boxes are not allowed in the server then we handle this here
            const shulkerItems = ["minecraft:shulker_box", "minecraft:undyed_shulker_box"];
            if (antiShulkerBoolean && itemName.typeId in shulkerItems) {
                entity.kill();
                continue;
            }
            // If it is an illegal item then remove it
            if (itemName.typeId in illegalitems) {
                entity.kill();
                continue;
            }
            // If it is an illegal stack then remove it
            const maxStack = maxItemStack[itemName.typeId] ?? defaultMaxItemStack;
            if (itemName.amount < 0 || itemName.amount > maxStack) {
                entity.kill();
                continue;
            }
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function IllegalItemsC() {
    const illegalItemsCId = system.runInterval(() => {
        illegalitemsc(illegalItemsCId);
    });
}
