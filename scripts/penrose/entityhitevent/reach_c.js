import { world, Player } from "mojang-minecraft";
import config from "../../data/config.js";
import { crypto, flag } from "../../util.js";

const World = world;

function reachc(object) {
    // Get Dynamic Property
    let reachCBoolean = World.getDynamicProperty('reachc_b');
    if (reachCBoolean === undefined) {
        reachCBoolean = config.modules.reachC.enabled;
    }
    // Unsubscribe if disabled in-game
    if (reachCBoolean === false) {
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

    // Check for hash/salt and validate password
    let hash = entity.getDynamicProperty('hash');
    let salt = entity.getDynamicProperty('salt');
    let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Return if player has op
    if (hash !== undefined && encode === hash) {
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
    World.events.entityHit.subscribe(object => reachc(object));
};

export { ReachC };
