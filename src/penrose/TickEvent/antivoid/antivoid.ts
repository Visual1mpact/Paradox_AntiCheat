import { world, EntityQueryOptions, GameMode, system } from "@minecraft/server";
//import { flag } from "../../../util.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

function antiVoid(id: number) {
    //exclude players who are in creative.
    const gm: EntityQueryOptions = {
        excludeGameModes: [GameMode.creative, GameMode.spectator],
    };
    const filteredPlayers = world.getPlayers(gm);

    /*const airBlocksToCheck = new Set<{ dx: number; dy: number; dz: number }>([
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
    ]); */

    for (const player of filteredPlayers) {
        // Get unique ID
        const uniqueId = dynamicPropertyRegistry.get(player?.id);

        // Skip if they have permission
        if (uniqueId === player.name) {
            continue;
        }

        let lastStandingBlock;
        let checkAfterFall;
        let lastFallingCord;
        if (player.isFalling == true) {
            lastFallingCord = player.location.y;
        }
        if (player.isOnGround == true && checkAfterFall == false) {
            lastStandingBlock = player.location.y;
        }
        if (player.isOnGround == true && checkAfterFall == true) {
            console.log(lastStandingBlock);
            console.log(lastFallingCord);
        }
        //console.log(`1: ${y1}\n2: ${y2}\n3: ${y3}\n4: ${y4}\n5: ${y5}\n6: ${y6}\n7: ${y7}`);
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function antiVoida() {
    const antiVoidId = system.runInterval(() => {
        antiVoid(antiVoidId);
    }, 20);
}
