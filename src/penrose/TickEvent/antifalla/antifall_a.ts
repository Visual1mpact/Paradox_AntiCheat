import { world, EntityQueryOptions, GameMode, system, Block } from "@minecraft/server";
import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

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

    const airBlocksToCheck = new Set<{ dx: number; dy: number; dz: number }>([
        //check for a half block that the player maybe standing on if its a lower slab
        { dx: 0, dy: -0.5, dz: 0 },
        { dx: 0, dy: -1, dz: 0 },
        { dx: 1, dy: -1, dz: 0 },
        { dx: -1, dy: -1, dz: 0 },
        { dx: 0, dy: -1, dz: 1 },
        { dx: 0, dy: -0.5, dz: 1 },
        { dx: 0, dy: -1, dz: -1 },
        { dx: 0, dy: -0.5, dz: -1 },
        { dx: 1, dy: -1, dz: 1 },
        { dx: 1, dy: -0.5, dz: 1 },
        { dx: 1, dy: -1, dz: -1 },
        { dx: 1, dy: -0.5, dz: -1 },
        { dx: -1, dy: -1, dz: 1 },
        { dx: -1, dy: -0.5, dz: 1 },
        { dx: -1, dy: -1, dz: -1 },
        { dx: -1, dy: -0.5, dz: -1 },
    ]);

    for (const player of filteredPlayers) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }

        const { x, y, z } = player.location;
        const vy = player.getVelocity().y;

        let allBlocksAreAir = true;
        for (const offset of airBlocksToCheck) {
            const offsetVector = { x: x + offset.dx, y: y + offset.dy, z: z + offset.dz };
            let block: Block | undefined;
            try {
                block = player?.dimension?.getBlock(offsetVector) || undefined;
            } catch {}
            if (!block || !block.isAir) {
                allBlocksAreAir = false;
                break;
            }
        }

        if (allBlocksAreAir && vy === 0) {
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
