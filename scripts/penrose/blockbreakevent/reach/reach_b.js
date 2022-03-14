import { world } from "mojang-minecraft";
import config from "../../../data/config.js";
// import { flag } from "../../../util.js";

const World = world;

function reachb(block) {
    // Unsubscribe if disabled in-game
    if (config.modules.reachB.enabled === false) {
        World.events.blockBreak.unsubscribe(reachb);
        return;
    }
    // Get the properties of the block being destroyed
    let blockID = block.brokenBlockPermutation.clone();

    // Calculate the distance between the player and the block being destroyed
    let reach = Math.sqrt((block.block.location.x - block.player.location.x)**2 + (block.block.location.y - block.player.location.y)**2 + (block.block.location.z - block.player.location.z)**2);

    if(reach > config.modules.reachB.reach && !block.player.hasTag('paradoxOpped')) {
        // flag(block.player, "Reach", "B", "Break", "reach", reach.toFixed(3), false, false);
        block.block.setPermutation(blockID);
    }
}

const ReachB = () => {
    World.events.blockBreak.subscribe(block => reachb(block));
};

export { ReachB };
