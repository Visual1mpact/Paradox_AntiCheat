import { world, EntityQueryOptions, system } from "@minecraft/server";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../WorldInitializeAfterEvent/registry.js";

async function hotbar(id: number) {
    // Get Dynamic Property
    const hotbarBoolean = dynamicPropertyRegistry.get("hotbar_b");

    // Unsubscribe if disabled in-game
    if (hotbarBoolean === false) {
        system.clearRun(id);
        return;
    }
    let hotbarMessage: string;
    const filter: EntityQueryOptions = {
        excludeTags: ["vanish"],
    };
    const filteredPlayers = world.getPlayers(filter);
    // run as each player
    for (const player of filteredPlayers) {
        hotbarMessage = config.modules.hotbar.message;
        player.onScreenDisplay.setActionBar(hotbarMessage);
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function Hotbar() {
    const hotbarId = system.runInterval(() => {
        hotbar(hotbarId).catch((error) => {
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
