import { world, Player, EntityHitEvent } from "@minecraft/server";
import config from "../../data/config.js";
import { crypto, flag } from "../../util.js";
import { dynamicPropertyRegistry } from "../worldinitializeevent/registry.js";

const World = world;

function reachc(object: EntityHitEvent) {
    // Get Dynamic Property
    const reachCBoolean = dynamicPropertyRegistry.get("reachc_b");

    // Unsubscribe if disabled in-game
    if (reachCBoolean === false) {
        World.events.entityHit.unsubscribe(reachc);
        return;
    }

    // Properties from class
    const { hitEntity, hitBlock, entity } = object;

    // If it's not a player then ignore
    if (!(entity instanceof Player)) {
        return;
    }

    // If a block is hit then ignore
    if (hitBlock) {
        return;
    }

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(entity.scoreboard.id);

    // Skip if they have permission
    if (uniqueId === entity.name) {
        return;
    }

    // Entity coordinates
    const { x, y, z } = hitEntity.location;
    // Player coordinates
    const { x: x1, y: y1, z: z1 } = entity.location;

    // Calculate the distance between the player and the entity being hit
    const reach = Math.sqrt((x - x1) ** 2 + (y - y1) ** 2 + (z - z1) ** 2);

    if (reach > config.modules.reachC.reach) {
        flag(entity, "Reach", "C", "Attack", null, null, "reach", reach.toFixed(3), false, null);
    }
}

const ReachC = () => {
    World.events.entityHit.subscribe(reachc);
};

export { ReachC };
