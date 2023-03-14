import { world, BlockLocation, MinecraftBlockTypes, BlockPlaceEvent } from "@minecraft/server";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";
// import { flag } from "../../../util.js";

function reacha(object: BlockPlaceEvent) {
    // Get Dynamic Property
    const reachABoolean = dynamicPropertyRegistry.get("reacha_b");

    // Unsubscribe if disabled in-game
    if (reachABoolean === false) {
        world.events.blockPlace.unsubscribe(reacha);
        return;
    }

    // Properties from class
    const { block, player, dimension } = object;

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

    // Calculate the distance squared between the player and the block being placed
    const dx = x - x1;
    const dy = y - y1;
    const dz = z - z1;
    const distanceSquared = dx * dx + dy * dy + dz * dz;

    if (distanceSquared > config.modules.reachA.reach * config.modules.reachA.reach) {
        dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air);
        // flag(player, "Reach", "A", "Placement", false, false "reach", Math.sqrt(distanceSquared).toFixed(3), false, false);
    }
}

const ReachA = () => {
    world.events.blockPlace.subscribe(reacha);
};

export { ReachA };
