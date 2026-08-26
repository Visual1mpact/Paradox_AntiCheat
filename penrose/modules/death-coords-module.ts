import { Player, EntityDieAfterEvent } from "@minecraft/server";
import { EventCoordinator } from "../classes/core/event-coordinator";

let deathSubscription: ((event: EntityDieAfterEvent) => void) | undefined;

export function startDeathCoords(): void {
    if (deathSubscription) return;

    deathSubscription = (event) => {
        const deadEntity = event.deadEntity;

        if (deadEntity instanceof Player) {
            const { x, y, z } = deadEntity.location;
            const dimension = (deadEntity.dimension.id.split(":")[1] ?? deadEntity.dimension.id).replace(/_/g, " ");

            deadEntity.sendMessage(`§2[§7Paradox§2]§o§7 You died at: §f${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)} §7in §f${dimension}§7.`);
        }
    };
    EventCoordinator.subscribeAfter("entityDie", deathSubscription);
}

export function stopDeathCoords(): void {
    if (!deathSubscription) return;
    EventCoordinator.unsubscribeAfter("entityDie", deathSubscription);
    deathSubscription = undefined;
}
