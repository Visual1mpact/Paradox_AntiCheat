import { world, MinecraftBlockTypes, BlockPlaceAfterEvent } from "@minecraft/server";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";
// import { flag } from "../../../util.js";

function reacha(object: BlockPlaceAfterEvent) {
    // Get Dynamic Property
    const reachABoolean = dynamicPropertyRegistry.get("reacha_b");

    // Unsubscribe if disabled in-game
    if (reachABoolean === false) {
        world.afterEvents.blockPlace.unsubscribe(reacha);
        return;
    }

    // Properties from class
    const { block, player, dimension } = object;

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

    // Calculate the distance squared between the player and the block being placed
    const dx = x - x1;
    const dy = y - y1;
    const dz = z - z1;
    const distanceSquared = Math.floor(dx * dx + dy * dy + dz * dz);

    if (distanceSquared > config.modules.reachA.reach * config.modules.reachA.reach) {
        dimension.getBlock({ x: x, y: y, z: z }).setType(MinecraftBlockTypes.air);
        // flag(player, "Reach", "A", "Placement", null, null, "reach", Math.sqrt(distanceSquared).toFixed(3), false, null);
    }
}

const ReachA = () => {
    world.afterEvents.blockPlace.subscribe(reacha);
};

export { ReachA };
