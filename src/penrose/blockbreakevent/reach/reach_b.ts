import { BlockBreakEvent, world } from "@minecraft/server";
import config from "../../../data/config.js";
import { crypto } from "../../../util.js";
// import { flag } from "../../../util.js";

const World = world;

function reachb(object: BlockBreakEvent) {
    // Get Dynamic Property
    let reachBBoolean = World.getDynamicProperty("reachb_b");
    if (reachBBoolean === undefined) {
        reachBBoolean = config.modules.reachB.enabled;
    }
    // Unsubscribe if disabled in-game
    if (reachBBoolean === false) {
        World.events.blockBreak.unsubscribe(reachb);
        return;
    }

    // Properties from class
    let { block, player, brokenBlockPermutation } = object;

    // Check for hash/salt and validate password
    let hash = player.getDynamicProperty("hash");
    let salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Return if player has op
    if (hash !== undefined && encode === hash) {
        return;
    }

    // Block coordinates
    let { x, y, z } = block.location;
    // Player coordinates
    let { x: x1, y: y1, z: z1 } = player.location;

    // Get the properties of the block being destroyed
    let blockID = brokenBlockPermutation.clone();

    // Calculate the distance between the player and the block being destroyed
    let reach = Math.sqrt((x - x1) ** 2 + (y - y1) ** 2 + (z - z1) ** 2);

    if (reach > config.modules.reachB.reach) {
        block.setPermutation(blockID);
        // flag(player, "Reach", "B", "Break", false, false, "reach", reach.toFixed(3), false, false);
    }
}

const ReachB = () => {
    World.events.blockBreak.subscribe(reachb);
};

export { ReachB };
