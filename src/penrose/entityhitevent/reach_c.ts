import { world, Player, EntityHitEvent } from "@minecraft/server";
import config from "../../data/config.js";
import { flag } from "../../util.js";
import { dynamicPropertyRegistry } from "../worldinitializeevent/registry.js";

function reachc(object: EntityHitEvent) {
    // Get Dynamic Property
    const reachCBoolean = dynamicPropertyRegistry.get("reachc_b");

    // Unsubscribe if disabled in-game
    if (reachCBoolean === false) {
        world.events.entityHit.unsubscribe(reachc);
        return;
    }

    // Properties from class
    const { hitEntity, hitBlock, entity } = object;

    // If a block or not a player entity then ignore
    if (!(hitEntity instanceof Player) || hitBlock !== undefined || !(entity instanceof Player)) {
        return;
    }

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(entity?.id);

    // Skip if they have permission
    if (uniqueId === entity.name) {
        return;
    }

    // Entity coordinates
    const { x, y, z } = hitEntity.location;
    // Player coordinates
    const { x: x1, y: y1, z: z1 } = entity.location;

    const dx = x - x1;
    const dy = y - y1;
    const dz = z - z1;
    const distanceSquared = dx * dx + dy * dy + dz * dz;

    if (distanceSquared > config.modules.reachC.reach * config.modules.reachC.reach) {
        flag(entity, "Reach", "C", "Attack", null, null, "reach", Math.sqrt(distanceSquared).toFixed(3), false, null);
    }
}

const ReachC = () => {
    world.events.entityHit.subscribe(reachc);
};

export { ReachC };
