import { world, EntityQueryOptions } from "@minecraft/server";
import config from "../../../data/config.js";

const World = world;

function hotbar() {
    // Get Dynamic Property
    let hotbarBoolean = World.getDynamicProperty("hotbar_b");
    if (hotbarBoolean === undefined) {
        hotbarBoolean = config.modules.hotbar.enabled;
    }
    // Unsubscribe if disabled in-game
    if (hotbarBoolean === false) {
        World.events.tick.unsubscribe(hotbar);
        return;
    }
    let hotbarMessage: string;
    let filter = new Object() as EntityQueryOptions;
    filter.excludeTags = ["vanish"];
    // run as each player
    for (let player of World.getPlayers(filter)) {
        hotbarMessage = config.modules.hotbar.message;
        player.runCommand(`titleraw @s actionbar {"rawtext":[{"text":${JSON.stringify(hotbarMessage)}}]}`);
    }
}

const Hotbar = () => {
    World.events.tick.subscribe(hotbar);
};

export { Hotbar };
