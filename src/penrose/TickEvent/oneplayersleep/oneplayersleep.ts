import { world, EntityQueryOptions, Player, system } from "@minecraft/server";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

function setTimeoutAsync(delay: number): Promise<void> {
    return new Promise((resolve) => system.runTimeout(resolve, delay));
}

async function queueSleep(player: Player) {
    await Promise.all([player.runCommandAsync(`time set 126553000`), player.runCommandAsync(`weather clear`)]);
    const hotbarBoolean = dynamicPropertyRegistry.get("hotbar_b");
    if (hotbarBoolean === undefined || hotbarBoolean === false) {
        player.runCommand(`title @a[tag=!vanish] actionbar Good Morning`);
    }
}

async function ops(opsId: number) {
    // Get Dynamic Property
    const opsBoolean = dynamicPropertyRegistry.get("ops_b");

    // Unsubscribe if disabled in-game
    if (opsBoolean === false) {
        system.clearRun(opsId);
        return;
    }

    const filter: EntityQueryOptions = { tags: ["sleeping"] };
    const filteredPlayers = world.getPlayers(filter);

    for (const player of filteredPlayers) {
        /**
         * Check if player still has the "sleeping" tag
         *
         * This is necessary because the first player in the loop might have changed the time and weather,
         * causing subsequent players to no longer be sleeping. By checking if the player still has the
         * "sleeping" tag before calling the queueSleep function, we ensure that only players who are
         * still considered to be sleeping have the time and weather changes applied to them.
         */
        const stillSleeping = player.hasTag("sleeping");

        if (stillSleeping) {
            // Wait for 2 seconds
            await setTimeoutAsync(40);

            // Call queueSleep after 2 seconds
            await queueSleep(player).catch((error) => {
                console.error("Paradox Unhandled Rejection: ", error);
                // Extract stack trace information
                if (error instanceof Error) {
                    const stackLines = error.stack.split("\n");
                    if (stackLines.length > 1) {
                        const sourceInfo = stackLines;
                        console.error("Error originated from:", sourceInfo[0]);
                    }
                }
            });
        }
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function OPS() {
    const opsId = system.runInterval(() => {
        ops(opsId).catch((error) => {
            console.error("Paradox Unhandled Rejection: ", error);
            // Extract stack trace information
            if (error instanceof Error) {
                const stackLines = error.stack.split("\n");
                if (stackLines.length > 1) {
                    const sourceInfo = stackLines;
                    console.error("Error originated from:", sourceInfo[0]);
                }
            }
        });
    });
}
