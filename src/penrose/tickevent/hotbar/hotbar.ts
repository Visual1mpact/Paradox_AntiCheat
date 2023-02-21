import { world, EntityQueryOptions, system } from "@minecraft/server";
import config from "../../../data/config.js";

const World = world;

function hotbar(id: number) {
    // Get Dynamic Property
    let hotbarBoolean = World.getDynamicProperty("hotbar_b");
    if (hotbarBoolean === undefined) {
        hotbarBoolean = config.modules.hotbar.enabled;
    }
    // Unsubscribe if disabled in-game
    if (hotbarBoolean === false) {
        system.clearRunSchedule(id);
        return;
    }
    let hotbarMessage: string;
    let filter = new Object() as EntityQueryOptions;
    filter.excludeTags = ["vanish"];
    // run as each player
    for (let player of World.getPlayers(filter)) {
        hotbarMessage = config.modules.hotbar.message;
        player.runCommandAsync(`titleraw @s actionbar {"rawtext":[{"text":${JSON.stringify(hotbarMessage)}}]}`);
    }
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export const Hotbar = system.runSchedule(() => {
    hotbar(Hotbar);
});
