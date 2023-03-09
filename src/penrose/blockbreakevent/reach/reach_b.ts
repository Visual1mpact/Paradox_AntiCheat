import { BlockBreakEvent, world } from "@minecraft/server";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";
// import { flag } from "../../../util.js";

const World = world;

function reachb(object: BlockBreakEvent) {
    // Get Dynamic Property
    const reachBBoolean = dynamicPropertyRegistry.get("reachb_b");

    // Unsubscribe if disabled in-game
    if (reachBBoolean === false) {
        World.events.blockBreak.unsubscribe(reachb);
        return;
    }

    // Properties from class
    const { block, player, brokenBlockPermutation } = object;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Skip if they have permission
    if (uniqueId === player.name) {
        return;
    }

    // Block coordinates
    const { x, y, z } = block.location;
    // Player coordinates
    const { x: x1, y: y1, z: z1 } = player.location;

    // Get the properties of the block being destroyed
    const blockID = brokenBlockPermutation.clone();

    // Calculate the distance between the player and the block being destroyed
    const reach = Math.sqrt((x - x1) ** 2 + (y - y1) ** 2 + (z - z1) ** 2);

    if (reach > config.modules.reachB.reach) {
        block.setPermutation(blockID);
        // flag(player, "Reach", "B", "Break", false, false, "reach", reach.toFixed(3), false, false);
    }
}

const ReachB = () => {
    World.events.blockBreak.subscribe(reachb);
};

export { ReachB };
