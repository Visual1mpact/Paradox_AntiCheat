import { EntityItemComponent, EntityQueryOptions, world, system } from "@minecraft/server";
import { illegalitems } from "../../../data/itemban.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

function illegalitemsc(id: number) {
    // Get Dynamic Property
    const illegalItemsCBoolean = dynamicPropertyRegistry.get("illegalitemsc_b");
    const antiShulkerBoolean = dynamicPropertyRegistry.get("antishulker_b");
    const shulkerItems = ["minecraft:shulker_box", "minecraft:undyed_shulker_box"];

    // Unsubscribe if disabled in-game
    if (illegalItemsCBoolean === false) {
        system.clearRun(id);
        return;
    }

    const filter: EntityQueryOptions = {
        type: "item",
    };
    const filteredEntities = world.getDimension("overworld").getEntities(filter);
    const filteredEntitiesLength = filteredEntities.length;

    for (let i = 0; i < filteredEntitiesLength; i++) {
        const entity = filteredEntities[i];

        // Get component of itemStack for dropped item
        const itemContainer = entity.getComponent("item") as EntityItemComponent;
        const itemName = itemContainer?.itemStack;

        // Check if object returns undefined and skip if it does
        if (!itemName) {
            continue;
        }

        if (entity.typeId === "minecraft:item") {
            // If shulker boxes are not allowed in the server then we handle this here
            if (antiShulkerBoolean && shulkerItems.includes(itemName.typeId)) {
                entity.kill();
            } else if (illegalitems.has(itemName.typeId)) {
                // If it is an illegal item then remove it
                entity.kill();
            } else {
                // If it is an illegal stack then remove it
                const currentAmount = itemName.amount;
                const maxAmount = itemName.maxAmount;
                if (currentAmount < 0 || currentAmount > maxAmount) {
                    entity.kill();
                }
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
    }, 20);
}
