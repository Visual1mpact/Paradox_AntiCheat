import { world, EntityQueryScoreOptions, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";

const World = world;

function hotbar() {
    // Unsubscribe if disabled in-game
    if (config.modules.hotbar.enabled === false) {
        World.events.tick.unsubscribe(hotbar);
        return;
    }
    let hotbarMessage;
    let filter = new EntityQueryScoreOptions();
    filter.objective = "hotbar";
    filter.minScore = 1;
    let scoreFilter = new EntityQueryOptions();
    scoreFilter.scoreOptions = [filter];
    scoreFilter.excludeTags = ['performance', 'vanish'];
    // run as each player
    for (let player of World.getPlayers(scoreFilter)) {
        hotbarMessage = config.modules.hotbar.message;
        player.runCommand(`titleraw @s actionbar {"rawtext":[{"text":"${hotbarMessage}"}]}`);
    }
}

const Hotbar = () => {
    World.events.tick.subscribe(() => hotbar());
};

export { Hotbar };