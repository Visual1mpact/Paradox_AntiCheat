import { Player, EntityDieAfterEvent, system, BlockComponentTypes, BlockSignComponent, BlockPermutation, ItemStack } from "@minecraft/server";

import { EventCoordinator } from "../classes/core/event-coordinator";

let graveSubscription: ((event: EntityDieAfterEvent) => void) | undefined;

/**
 * Grave Saver configuration.
 */
const GRAVE_CONFIG = {
    /**
     * Maximum distance from the death location from which
     * dropped item entities will be collected.
     */
    ITEM_COLLECTION_RADIUS: 3,

    /**
     * Delay after the death event.
     *
     * This gives vanilla Minecraft time to finish creating
     * the dropped item entities.
     */
    DROP_PROCESS_DELAY: 1,

    /**
     * Block used for grave storage.
     */
    CHEST_BLOCK: "minecraft:chest",

    /**
     * Bedrock uses minecraft:sign or wall sign blocks for wall-mounted signs.
     *
     * The sign becomes wall-mounted when resolved with
     * the facing_direction state instead of
     * ground_sign_direction.
     */
    SIGN_BLOCK: "minecraft:bamboo_wall_sign",

    /**
     * The sign is placed immediately NORTH of the chest (the front face).
     *
     * Direction values:
     *
     * 2 = North
     * 3 = South
     * 4 = West
     * 5 = East
     *
     * Because the chest defaults to facing North, placing the sign at z - 1
     * and facing NORTH (2) attaches its back against the front face of the chest.
     */
    SIGN_FACING_DIRECTION: 2,
} as const;

/**
 * Starts the Grave Saver module.
 */
export function startGraveSaver(): void {
    // Prevent duplicate subscriptions.
    if (graveSubscription) return;

    graveSubscription = (event) => {
        const deadEntity = event.deadEntity;

        // Only create graves for players.
        if (!(deadEntity instanceof Player)) return;

        const deathLocation = deadEntity.location;
        const dimension = deadEntity.dimension;
        const playerName = deadEntity.name;

        /*
         * Capture integer coordinates immediately.
         *
         * This prevents the grave location from being affected by
         * anything that happens after the death event.
         */
        const deathX = Math.floor(deathLocation.x);
        const deathY = Math.floor(deathLocation.y);
        const deathZ = Math.floor(deathLocation.z);

        /*
         * Wait for vanilla item dropping to finish.
         */
        system.runTimeout(() => {
            /*
             * Find all dropped item entities around the death location.
             */
            const droppedItems = dimension.getEntities({
                type: "minecraft:item",
                location: deathLocation,
                maxDistance: GRAVE_CONFIG.ITEM_COLLECTION_RADIUS,
            });

            /*
             * Nothing was dropped.
             *
             * This can happen with keepInventory, an empty inventory,
             * or another situation where no item entities were created.
             */
            if (droppedItems.length === 0) return;

            /*
             * Extract the actual ItemStacks from the item entities.
             */
            const collectedItems: ItemStack[] = [];

            for (const itemEntity of droppedItems) {
                const itemComponent = itemEntity.getComponent("minecraft:item");

                const itemStack = itemComponent?.itemStack;

                if (!itemStack) continue;

                /*
                 * Save the stack for insertion into the grave chest.
                 */
                collectedItems.push(itemStack);

                /*
                 * Remove the original dropped entity.
                 *
                 * This prevents the original item entity from remaining
                 * after the stack has been transferred into the grave.
                 */
                itemEntity.remove();
            }

            /*
             * Make sure we actually collected something.
             */
            if (collectedItems.length === 0) return;

            /*
             * Use an index instead of Array.shift().
             *
             * Array.shift() is O(n), whereas incrementing an index
             * is O(1). This matters when processing larger inventories.
             */
            let itemIndex = 0;

            /*
             * Number of successfully created chests.
             */
            let chestCount = 0;

            const baseX = deathX;
            const baseY = deathY;
            const baseZ = deathZ;

            /*
             * Create vertically stacked chests until every ItemStack
             * has been inserted.
             *
             * Example:
             *
             * y + 0 = Chest #1
             * y + 1 = Chest #2
             * y + 2 = Chest #3
             */
            while (itemIndex < collectedItems.length) {
                const chestLocation = {
                    x: baseX,
                    y: baseY + chestCount,
                    z: baseZ,
                };

                /*
                 * Place the chest.
                 */
                dimension.setBlockType(chestLocation, GRAVE_CONFIG.CHEST_BLOCK);

                /*
                 * Retrieve the newly created chest block.
                 */
                const chestBlock = dimension.getBlock(chestLocation);

                if (!chestBlock) {
                    break;
                }

                /*
                 * Get the chest inventory component.
                 */
                const inventoryComponent = chestBlock.getComponent("minecraft:inventory");

                const container = inventoryComponent?.container;

                /*
                 * Failsafe in case the chest could not provide
                 * an inventory component.
                 */
                if (!container) {
                    break;
                }

                /*
                 * Fill the chest.
                 *
                 * We continue until either:
                 *
                 * 1. The chest is full, or
                 * 2. All collected items have been inserted.
                 */
                for (let slot = 0; slot < container.size && itemIndex < collectedItems.length; slot++) {
                    container.setItem(slot, collectedItems[itemIndex]);

                    itemIndex++;
                }

                /*
                 * Successfully created another grave chest.
                 */
                chestCount++;
            }

            /*
             * If no chest was created, there is nowhere to place
             * the marker sign.
             */
            if (chestCount === 0) {
                return;
            }

            /*
             * ============================================================
             * WALL-MOUNTED GRAVE SIGN (FRONT OF CHEST)
             * ============================================================
             *
             * The base chest is at:
             *
             *     (x, y, z)
             *
             * Default placed chests face NORTH.
             * The sign is placed immediately NORTH (front face) of it:
             *
             *     (x, y, z - 1)
             *
             * The sign faces NORTH (facing_direction = 2).
             *
             * This means the sign's back is against the front face
             * of the chest while its text faces outward toward the player.
             */
            const signLocation = {
                x: baseX,
                y: baseY,
                z: baseZ - 1,
            };

            /*
             * Get the block where the sign will be placed.
             */
            const signBlock = dimension.getBlock(signLocation);

            if (signBlock) {
                /*
                 * Resolve the wall sign permutation.
                 *
                 * facing_direction = 2
                 *
                 * means the sign faces NORTH.
                 *
                 * Since the chest is immediately SOUTH of the sign,
                 * the sign's back is attached to the front of the chest.
                 */
                const signPermutation = BlockPermutation.resolve(GRAVE_CONFIG.SIGN_BLOCK, {
                    facing_direction: GRAVE_CONFIG.SIGN_FACING_DIRECTION,
                });

                /*
                 * Apply the wall-mounted sign permutation.
                 */
                signBlock.setPermutation(signPermutation);

                /*
                 * Retrieve the sign component.
                 */
                const signComponent = signBlock.getComponent(BlockComponentTypes.Sign) as BlockSignComponent | undefined;

                if (signComponent) {
                    /*
                     * Write the grave information to the sign.
                     */
                    signComponent.setText(`§4[Grave]\n` + `§8${playerName}\n` + `§7Died at:\n` + `§8${deathX}, ${deathY}, ${deathZ}`);

                    /*
                     * Wax the sign so players cannot edit it.
                     */
                    signComponent.setWaxed(true);
                }
            }

            /*
             * Notify the player if they are still a valid entity.
             */
            if (deadEntity.isValid) {
                deadEntity.sendMessage(`§2[§7Paradox§2]§o§7 ` + `A grave chest with a marker sign has been created at ` + `§e${deathX}, ${deathY}, ${deathZ}§7.`);
            }
        }, GRAVE_CONFIG.DROP_PROCESS_DELAY);
    };

    /*
     * Subscribe to the entity death event through Paradox's
     * EventCoordinator.
     */
    EventCoordinator.subscribeAfter("entityDie", graveSubscription);
}

/**
 * Stops the Grave Saver module.
 */
export function stopGraveSaver(): void {
    // Nothing to unsubscribe from.
    if (!graveSubscription) return;

    EventCoordinator.unsubscribeAfter("entityDie", graveSubscription);

    graveSubscription = undefined;
}
