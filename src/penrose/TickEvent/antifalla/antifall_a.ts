import { world, Block, EntityQueryOptions, GameMode, system, Vector } from "@minecraft/server";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

function isAir(block: Block): boolean {
    return block.typeId === "minecraft:air";
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
            new Vector(x, y - 1, z),
            new Vector(x + 1, y - 1, z),
            new Vector(x - 1, y - 1, z),
            new Vector(x, y - 1, z + 1),
            new Vector(x, y - 1, z - 1),
            new Vector(x - 1, y - 1, z + 1),
            new Vector(x - 1, y - 1, z - 1),
            new Vector(x + 1, y - 1, z + 1),
            new Vector(x + 1, y - 1, z - 1),
        ];

        const blocks = blocksToCheck.map((block) => player.dimension.getBlock(block));
        const areAllBlocksAir = blocks.every(isAir);

        if (areAllBlocksAir && vy === 0) {
            flag(player, "AntiFall", "A", "Exploit", null, null, null, null, false, null);
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
