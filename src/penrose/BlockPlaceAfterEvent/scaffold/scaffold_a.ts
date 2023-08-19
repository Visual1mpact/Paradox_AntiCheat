import { world, MinecraftBlockTypes, BlockPlaceAfterEvent } from "@minecraft/server";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

function scaffolda(object: BlockPlaceAfterEvent) {
    // Get Dynamic Property
    const antiScaffoldABoolean = dynamicPropertyRegistry.get("antiscaffolda_b");

    // Unsubscribe if disabled in-game
    if (antiScaffoldABoolean === false) {
        world.afterEvents.blockPlace.unsubscribe(scaffolda);
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

    // Block below placement
    const belowBlockLocation = { x, y: y - 1, z };

    // Is it air
    const blockType = dimension.getBlock(belowBlockLocation).isAir();

    // Are they sprinting
    const isSprinting = player.isSprinting;

    if (blockType && isSprinting) {
        dimension.getBlock({ x: x, y: y, z: z }).setType(MinecraftBlockTypes.air);
        flag(player, "Scaffold", "A", "Placement", null, null, null, null, false);
    }
}

const ScaffoldA = () => {
    world.afterEvents.blockPlace.subscribe(scaffolda);
};

export { ScaffoldA };
