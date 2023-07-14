import { world, Player, EntityHitEntityAfterEvent } from "@minecraft/server";
import config from "../../data/config.js";
import { flag } from "../../util.js";
import { dynamicPropertyRegistry } from "../WorldInitializeAfterEvent/registry.js";

function reachb(object: EntityHitEntityAfterEvent) {
    // Get Dynamic Property
    const reachBBoolean = dynamicPropertyRegistry.get("reachb_b");

    // Unsubscribe if disabled in-game
    if (reachBBoolean === false) {
        world.afterEvents.entityHitEntity.unsubscribe(reachb);
        return;
    }

    // Properties from class
    const { hitEntity, damagingEntity } = object;

    // If a block or not a player entity then ignore
    if (!(hitEntity instanceof Player) || !(damagingEntity instanceof Player)) {
        return;
    }

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(damagingEntity?.id);

    // Skip if they have permission
    if (uniqueId === damagingEntity.name) {
        return;
    }

    // Entity coordinates
    const { x, y, z } = hitEntity.location;
    // Player coordinates
    const { x: x1, y: y1, z: z1 } = damagingEntity.location;

    const dx = x - x1;
    const dy = y - y1;
    const dz = z - z1;
    const distanceSquared = Math.floor(dx * dx + dy * dy + dz * dz);

    if (distanceSquared > config.modules.reachB.reach * config.modules.reachB.reach) {
        flag(damagingEntity, "Reach", "B", "Attack", null, null, "reach", Math.sqrt(distanceSquared).toFixed(3), false);
    }
}

const ReachB = () => {
    world.afterEvents.entityHitEntity.subscribe(reachb);
};

export { ReachB };
