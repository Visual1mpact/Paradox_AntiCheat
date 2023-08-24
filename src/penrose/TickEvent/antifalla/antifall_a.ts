import { world, Block, EntityQueryOptions, GameMode, system } from "@minecraft/server";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

function isAir(block: Block): boolean {
    return block?.typeId === "minecraft:air";
}

function antifalla(id: number) {
    // Get Dynamic Property
    const antifallABoolean = dynamicPropertyRegistry.get("antifalla_b");

    // Unsubscribe if disabled in-game
    if (!antifallABoolean) {
        system.clearRun(id);
        return;
    }

    //exclude players who are in creative.
    const gm: EntityQueryOptions = {
        excludeGameModes: [GameMode.creative, GameMode.spectator],
    };
    const filteredPlayers = world.getPlayers(gm);

    for (const player of filteredPlayers) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }

        const { x, y, z } = player.location;
        const vy = player.getVelocity().y;
        const blocksToCheck = [
            //check for a half block that the player maybe standing on if its a lower slab
            { x: x, y: y - 0.5, z: z },
            { x: x, y: y - 1, z: z },
            { x: x + 1, y: y - 1, z: z },
            { x: x + 1, y: y - 0.5, z: z },
            { x: x + 1, y: y - 1, z: z },
            { x: x - 1, y: y - 1, z: z },
            { x: x - 1, y: y - 0.5, z: z },
            { x: x, y: y - 1, z: z + 1 },
            { x: x, y: y - 0.5, z: z + 1 },
            { x: x, y: y - 1, z: z - 1 },
            { x: x - 1, y: y - 1, z: z + 1 },
            { x: x - 1, y: y - 0.5, z: z + 1 },
            { x: x - 1, y: y - 1, z: z - 1 },
            { x: x - 1, y: y - 0.5, z: z - 1 },
            { x: x + 1, y: y - 1, z: z + 1 },
            { x: x + 1, y: y - 0.5, z: z + 1 },
            { x: x + 1, y: y - 1, z: z - 1 },
            { x: x + 1, y: y - 0.5, z: z - 1 },
        ];

        const blocks = blocksToCheck.map((block) => player.dimension.getBlock(block));
        const areAllBlocksAir = blocks.every(isAir);

        if (areAllBlocksAir && vy === 0) {
            flag(player, "AntiFall", "A", "Exploit", null, null, null, null, false);
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function AntiFallA() {
    const antiFallAId = system.runInterval(() => {
        antifalla(antiFallAId);
    }, 20);
}
