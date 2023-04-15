import { BlockBreakEvent, world } from "@minecraft/server";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";
// import { flag } from "../../../util.js";

function reachb(object: BlockBreakEvent) {
    // Get Dynamic Property
    const reachBBoolean = dynamicPropertyRegistry.get("reachb_b");

    // Unsubscribe if disabled in-game
    if (reachBBoolean === false) {
        world.events.blockBreak.unsubscribe(reachb);
        return;
    }

    // Properties from class
    const { block, player, brokenBlockPermutation } = object;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player?.id);

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

    // Calculate the squared distance between the player and the block being destroyed
    const dx = x - x1;
    const dy = y - y1;
    const dz = z - z1;
    const distanceSquared = dx * dx + dy * dy + dz * dz;

    if (distanceSquared > config.modules.reachB.reach * config.modules.reachB.reach) {
        block.setPermutation(blockID);
        player.runCommandAsync(`kill @e[x=${x},y=${y},z=${z},r=3,c=1,type=item]`).catch(() => {
            // We are ignoring the error here as its not detrimental
        });
        // flag(player, "Reach", "B", "Break", null, null, "reach", Math.sqrt(distanceSquared).toFixed(3), false, null);
    }
}

const ReachB = () => {
    world.events.blockBreak.subscribe(reachb);
};

export { ReachB };
