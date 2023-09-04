import { world, MinecraftBlockTypes, Vector3, BlockPlaceAfterEvent } from "@minecraft/server";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

function isBlockInFrontAndBelowPlayer(blockLocation: Vector3, playerLocation: Vector3) {
    // Calculate the difference in coordinates between the block and player
    const dx = blockLocation.x - playerLocation.x;
    const dy = blockLocation.y - playerLocation.y;
    const dz = blockLocation.z - playerLocation.z;

    // You can adjust these thresholds based on your requirements
    // For example, you might want to consider a block in front and below if it's within a certain range.
    const xThreshold = 1.0;
    const yThresholdFront = 0.5; // Consider the block in front if it's at a similar height
    const yThresholdBelow = -0.5; // Consider the block below if it's a certain distance below the player
    const zThreshold = 1.0;

    return dx < xThreshold && dy < yThresholdFront && dy < yThresholdBelow && dz < zThreshold;
}

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

    // Cache player location
    const playerLocation = player.location;

    // Cache block location
    const blockLocation = block.location;

    // Check if the block is in front and below the player
    if (isBlockInFrontAndBelowPlayer(blockLocation, playerLocation)) {
        // Check if the block below is air
        const blockType = dimension.getBlock({ x: blockLocation.x, y: blockLocation.y - 1, z: blockLocation.z }).isAir();

        // Are they sprinting
        const isSprinting = player.isSprinting;

        if (blockType && isSprinting) {
            dimension.getBlock(blockLocation).setType(MinecraftBlockTypes.air);
            flag(player, "Scaffold", "A", "Placement", null, null, null, null, false);
        }
    }
}

const ScaffoldA = () => {
    world.afterEvents.blockPlace.subscribe(scaffolda);
};

export { ScaffoldA };
