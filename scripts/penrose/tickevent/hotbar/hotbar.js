import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";

const World = world;

function hotbar() {
    // Unsubscribe if disabled in-game
    if (config.modules.hotbar.enabled === false) {
        World.events.tick.unsubscribe(hotbar);
        return;
    }
    let hotbarMessage;
    let filter = new EntityQueryOptions();
    filter.excludeTags = ['performance', 'vanish'];
    // run as each player
    for (let player of World.getPlayers(filter)) {
        hotbarMessage = config.modules.hotbar.message;
        player.runCommand(`titleraw @s actionbar {"rawtext":[{"text":"${hotbarMessage}"}]}`);
    }
}

const Hotbar = () => {
    World.events.tick.subscribe(() => hotbar());
};

export { Hotbar };