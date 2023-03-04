import { world, BlockLocation, MinecraftBlockTypes, BlockPlaceEvent } from "@minecraft/server";
import config from "../../../data/config.js";
import { crypto } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";
// import { flag } from "../../../util.js";

const World = world;

function reacha(object: BlockPlaceEvent) {
    // Get Dynamic Property
    const reachABoolean = dynamicPropertyRegistry.get("reacha_b");

    // Unsubscribe if disabled in-game
    if (reachABoolean === false) {
        World.events.blockPlace.unsubscribe(reacha);
        return;
    }

    // Properties from class
    const { block, player, dimension } = object;

    // Check for hash/salt and validate password
    const hash = player.getDynamicProperty("hash");
    const salt = player.getDynamicProperty("salt");
    let encode: string;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
    // Return if player has op
    if (hash !== undefined && encode === hash) {
        return;
    }

    // Block coordinates
    const { x, y, z } = block.location;
    // Player coordinates
    const { x: x1, y: y1, z: z1 } = player.location;

    // Calculate the distance between the player and the block being placed
    const reach = Math.sqrt((x - x1) ** 2 + (y - y1) ** 2 + (z - z1) ** 2);

    if (reach > config.modules.reachA.reach) {
        dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air);
        // flag(player, "Reach", "A", "Placement", false, false "reach", reach.toFixed(3), false, false);
    }
}

const ReachA = () => {
    World.events.blockPlace.subscribe(reacha);
};

export { ReachA };
