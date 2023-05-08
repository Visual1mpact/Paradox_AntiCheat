import { world, EntityQueryOptions, Player, system } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

async function queueSleep(player: Player) {
    await Promise.all([player.runCommandAsync(`time set 126553000`), player.runCommandAsync(`weather clear`)]);
    const hotbarBoolean = dynamicPropertyRegistry.get("hotbar_b");
    if (hotbarBoolean === undefined || hotbarBoolean === false) {
        await player.runCommandAsync(`title @a[tag=!vanish] actionbar Good Morning`);
    }
}

function ops(opsID: number) {
    // Get Dynamic Property
    const opsBoolean = dynamicPropertyRegistry.get("ops_b");

    // Unsubscribe if disabled in-game
    if (opsBoolean === false) {
        system.clearRun(opsID);
        return;
    }

    const filter: EntityQueryOptions = { tags: ["sleeping"] };
    const filteredPlayers = world.getPlayers(filter);

    if (filteredPlayers.length > 0) {
        const player = filteredPlayers[0];

        // Wait for 2 seconds
        const startTime = Date.now();
        while (Date.now() - startTime < 2000) {
            // Do nothing
        }
        // Call queueSleep after 2 seconds
        queueSleep(player);
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function OPS() {
    const opsId = system.runInterval(() => {
        ops(opsId);
    });
}
