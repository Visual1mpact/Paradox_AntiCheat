import { EntityItemComponent, EntityQueryOptions, ItemStack, world, system } from "@minecraft/server";
import { illegalitems } from "../../../data/itemban.js";
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
    const filter: EntityQueryOptions = {
        type: "item",
    };
    const filteredEntities = world.getDimension("overworld").getEntities(filter);
    for (const entity of filteredEntities) {
        // Check if entity object returns undefined and skip it
        if (entity === undefined) {
            continue;
        }

        let itemName: ItemStack;
        // Get component of itemStack for dropped item
        const itemContainer = entity.getComponent("item") as unknown as EntityItemComponent;
        itemName = itemContainer?.itemStack;

        // Check if object returns undefined and skip if it does
        if (!itemName) {
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
            if (illegalitems.has(itemName.typeId)) {
                entity.kill();
                continue;
            }
            // If it is an illegal stack then remove it
            const currentAmount = itemName.amount;
            const maxAmount = itemName.maxAmount;
            if (currentAmount < 0 || currentAmount > maxAmount) {
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
