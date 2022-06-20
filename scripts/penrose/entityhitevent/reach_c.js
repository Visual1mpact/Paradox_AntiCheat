import { world, Player } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, flag } from "../../util.js";

const World = world;

function reachc(object) {
    // Unsubscribe if disabled in-game
    if (config.modules.reachC.enabled === false) {
        World.events.entityHit.unsubscribe(reachc);
        return;
    }

    // Properties from class
    let { hitEntity, hitBlock, entity } = object;

    // If it's not a player then ignore
    if (!(entity instanceof Player)) {
        return;
    }

    // If a block is hit then ignore
    if (hitBlock) {
        return;
    }

    // Return if player has op
    if (entity.hasTag('Hash:' + crypto)) {
        return;
    }

    // Entity coordinates
    let { x, y, z } = hitEntity.location;
    // Player coordinates
    let { x: x1, y: y1, z: z1 } = entity.location;
    
    // Calculate the distance between the player and the entity being hit
    let reach = Math.sqrt((x - x1)**2 + (y - y1)**2 + (z - z1)**2);

    if(reach > config.modules.reachC.reach) {
        flag(entity, "Reach", "C", "Attack", false, false, "reach", reach.toFixed(3), false, false);
    }
}

const ReachC = () => {
    World.events.entityHit.subscribe(reachc);
};

export { ReachC };
