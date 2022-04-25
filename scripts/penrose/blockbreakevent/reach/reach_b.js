import { world } from "mojang-minecraft";
import config from "../../../data/config.js";
// import { flag } from "../../../util.js";

const World = world;

function reachb(object) {
    // Unsubscribe if disabled in-game
    if (config.modules.reachB.enabled === false) {
        World.events.blockBreak.unsubscribe(reachb);
        return;
    }

    // Properties from class
    let { block, player, brokenBlockPermutation } = object;

    // Return if player has op
    if (player.hasTag('paradoxOpped')) {
        return;
    }

    // Block coordinates
    let { x, y, z } = block.location;
    // Player coordinates
    let { x1, y1, z1 } = player.location;

    // Get the properties of the block being destroyed
    let blockID = brokenBlockPermutation.clone();

    // Calculate the distance between the player and the block being destroyed
    let reach = Math.sqrt((x - x1)**2 + (y - y1)**2 + (z - z1)**2);

    if(reach > config.modules.reachB.reach) {
        block.setPermutation(blockID);
        // flag(player, "Reach", "B", "Break", false, false, "reach", reach.toFixed(3), false, false);
    }
}

const ReachB = () => {
    World.events.blockBreak.subscribe(object => reachb(object));
};

export { ReachB };
