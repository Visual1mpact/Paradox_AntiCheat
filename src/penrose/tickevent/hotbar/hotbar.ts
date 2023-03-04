import { world, EntityQueryOptions, system } from "@minecraft/server";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

async function hotbar(id: number) {
    // Get Dynamic Property
    const hotbarBoolean = dynamicPropertyRegistry.get("hotbar_b");

    // Unsubscribe if disabled in-game
    if (hotbarBoolean === false) {
        system.clearRunSchedule(id);
        return;
    }
    let hotbarMessage: string;
    const filter = new Object() as EntityQueryOptions;
    filter.excludeTags = ["vanish"];
    // run as each player
    for (const player of World.getPlayers(filter)) {
        hotbarMessage = config.modules.hotbar.message;
        await player.runCommandAsync(`titleraw @s actionbar {"rawtext":[{"text":${JSON.stringify(hotbarMessage)}}]}`);
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function Hotbar() {
    const hotbarId = system.runSchedule(() => {
        hotbar(hotbarId);
    });
}
