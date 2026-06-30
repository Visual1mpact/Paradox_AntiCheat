import { Player, EntityDieAfterEvent, system } from "@minecraft/server";
import { EventCoordinator } from "../classes/event-coordinator";

let graveSubscription: ((event: EntityDieAfterEvent) => void) | undefined;

export function startGraveSaver(): void {
    if (graveSubscription) return;

    graveSubscription = (event) => {
        const deadEntity = event.deadEntity;

        if (deadEntity instanceof Player) {
            const location = deadEntity.location;
            const { x, y, z } = location;
            const dim = deadEntity.dimension;
            const playerName = deadEntity.name;

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
                        entity.remove();
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
                    offset++;
                }

                if (deadEntity.isValid) {
                    deadEntity.sendMessage("§2[§7Paradox§2]§o§7 A grave chest has been created to store your dropped items.");
                }
            });
        }
    };
    EventCoordinator.subscribeAfter("entityDie", graveSubscription);
}

export function stopGraveSaver(): void {
    if (!graveSubscription) return;
    EventCoordinator.unsubscribeAfter("entityDie", graveSubscription);
    graveSubscription = undefined;
}
