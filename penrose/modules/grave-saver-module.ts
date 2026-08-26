import { Player, EntityDieAfterEvent, system, BlockComponentTypes, BlockSignComponent, BlockPermutation } from "@minecraft/server";
import { EventCoordinator } from "../classes/core/event-coordinator";

let graveSubscription: ((event: EntityDieAfterEvent) => void) | undefined;

export function startGraveSaver(): void {
    // Prevent multiple subscriptions if the module is already active
    if (graveSubscription) return;

    graveSubscription = (event) => {
        const deadEntity = event.deadEntity;

        // Ensure the entity that died is actually a player
        if (deadEntity instanceof Player) {
            const location = deadEntity.location;
            const { x, y, z } = location;
            const dim = deadEntity.dimension;
            const playerName = deadEntity.name;

            // Run on the next tick to ensure vanilla item dropping mechanics have completed
            system.run(() => {
                // Locate all dropped items within a 3-block radius of the death coordinates
                const itemsOnGround = dim.getEntities({
                    type: "item",
                    location: location,
                    maxDistance: 3,
                });

                // Exit early if no items dropped (e.g., empty inventory or keep inventory is on)
                if (itemsOnGround.length === 0) return;

                // Extract actual ItemStacks from the item entities on the ground
                const collectedItems = [];
                for (const entity of itemsOnGround) {
                    const itemComp = entity.getComponent("minecraft:item");
                    if (itemComp?.itemStack) {
                        collectedItems.push(itemComp.itemStack);
                        // Despawn the item entity to prevent lag and duplication
                        entity.remove();
                    }
                }

                // Double check that we actually gathered valid ItemStacks
                if (collectedItems.length === 0) return;

                let offset = 0;
                let baseChestLoc = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };

                // Create chests stacking upwards until all collected items are stored
                while (collectedItems.length > 0) {
                    const chestLoc = { x: Math.floor(x), y: Math.floor(y) + offset, z: Math.floor(z) };

                    // Place a chest block at the calculated location
                    dim.setBlockType(chestLoc, "minecraft:chest");
                    const block = dim.getBlock(chestLoc);
                    const container = block?.getComponent("minecraft:inventory")?.container;

                    // Failsafe in case block placement fails or inventory component is missing
                    if (!container) break;

                    // Fill the chest until it is full or we run out of items
                    for (let i = 0; i < container.size && collectedItems.length > 0; i++) {
                        const item = collectedItems.shift(); // Pull the first item from our array
                        if (item) {
                            // Store items cleanly without applying custom lore/NBT changes
                            container.setItem(i, item);
                        }
                    }
                    offset++; // Move up one block space if another chest is needed
                }

                // Calculate the location for the marker sign next to the base chest (+1 on X-axis)
                const signLoc = { x: baseChestLoc.x + 1, y: baseChestLoc.y, z: baseChestLoc.z };
                const supportLoc = { x: signLoc.x, y: signLoc.y - 1, z: signLoc.z };

                // Ensure there is a solid block beneath the sign location
                const supportBlock = dim.getBlock(supportLoc);
                if (supportBlock && (supportBlock.isAir || supportBlock.isLiquid)) {
                    dim.setBlockType(supportLoc, "minecraft:dirt");
                }

                // Prepare the sign location (overwrites existing blocks/obstacles)
                const signBlock = dim.getBlock(signLoc);

                if (signBlock) {
                    // Resolve and apply the standing sign permutation
                    const signPerm = BlockPermutation.resolve("minecraft:standing_sign", {
                        ground_sign_direction: 8,
                    });
                    signBlock.setPermutation(signPerm);

                    // Retrieve the BlockSignComponent using BlockComponentTypes
                    const signComponent = signBlock.getComponent(BlockComponentTypes.Sign) as BlockSignComponent;

                    if (signComponent) {
                        // Apply formatted death text to the sign
                        signComponent.setText(`§4[Grave]\n§8${playerName}\n§7Died at:\n§8${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}`);
                        // Lock the sign so players cannot edit it
                        signComponent.setWaxed(true);
                    }
                }

                // Notify the player where their grave was created
                if (deadEntity.isValid) {
                    deadEntity.sendMessage(`§2[§7Paradox§2]§o§7 A grave chest with a marker sign has been created at §e${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}§7.`);
                }
            });
        }
    };

    // Subscribe to the entity death event
    EventCoordinator.subscribeAfter("entityDie", graveSubscription);
}

export function stopGraveSaver(): void {
    // Only attempt to unsubscribe if the subscription exists
    if (!graveSubscription) return;
    EventCoordinator.unsubscribeAfter("entityDie", graveSubscription);
    graveSubscription = undefined;
}
