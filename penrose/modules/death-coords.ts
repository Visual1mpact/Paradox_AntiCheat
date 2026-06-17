import { Player, EntityDieAfterEvent, system } from "@minecraft/server";
import { EventCoordinator } from "../classes/event-coordinator";

/**
 * Reference to the death event subscription.
 */
let deathSubscription: ((event: EntityDieAfterEvent) => void) | undefined;

/**
 * Starts the Death Coordinates module.
 * Subscribes to entity death events and notifies players of their coordinates.
 */
export function startDeathCoords(): void {
    if (deathSubscription) return;

    deathSubscription = (event) => {
        const deadEntity = event.deadEntity;

        // Ensure the entity that died is a player
        if (deadEntity instanceof Player) {
            const location = deadEntity.location;
            const { x, y, z } = location;
            const dimension = deadEntity.dimension.id.split(":")[1].replace(/_/g, " ");
            const dim = deadEntity.dimension;
            const playerName = deadEntity.name;

            // Send the formatted coordinate message to the player
            deadEntity.sendMessage(`§2[§7Paradox§2]§o§7 You died at: §f${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)} §7in §f${dimension}§7.`);

            // Schedule grave creation in the next tick to ensure item drops have spawned
            system.run(() => {
                const itemsOnGround = dim.getEntities({
                    type: "item",
                    location: location,
                    maxDistance: 3,
                });

                if (itemsOnGround.length === 0) return;

                const collectedItems = [];
                for (const entity of itemsOnGround) {
                    const itemComp = entity.getComponent("minecraft:item");
                    if (itemComp?.itemStack) {
                        collectedItems.push(itemComp.itemStack);
                        entity.remove(); // Clean up the ground drops
                    }
                }

                if (collectedItems.length === 0) return;

                let offset = 0;
                while (collectedItems.length > 0) {
                    const chestLoc = { x: Math.floor(x), y: Math.floor(y) + offset, z: Math.floor(z) };

                    dim.setBlockType(chestLoc, "minecraft:chest");
                    const block = dim.getBlock(chestLoc);
                    const container = block?.getComponent("minecraft:inventory")?.container;

                    if (!container) break;

                    for (let i = 0; i < container.size && collectedItems.length > 0; i++) {
                        const item = collectedItems.shift();
                        if (item) {
                            item.setLore([`§7Grave of §f${playerName}`, `§7Died at §f${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}`]);
                            container.setItem(i, item);
                        }
                    }
                    offset++; // If inventory was massive, stack another chest on top
                }

                if (deadEntity.isValid) {
                    deadEntity.sendMessage("§2[§7Paradox§2]§o§7 A grave chest has been created to store your dropped items.");
                }
            });
        }
    };
    EventCoordinator.subscribeAfter("entityDie", deathSubscription);
}

/**
 * Stops the Death Coordinates module.
 * Unsubscribes from the death event to clean up resources.
 */
export function stopDeathCoords(): void {
    if (!deathSubscription) return;
    EventCoordinator.unsubscribeAfter("entityDie", deathSubscription);
    deathSubscription = undefined;
}
