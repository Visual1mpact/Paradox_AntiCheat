import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";
import { setTickTimeout } from "../../../timer/scheduling.js";

const World = world;

function queueSleep(player) {
    player.runCommand(`time set sunrise`);
    player.runCommand(`time add 2000`);
    player.runCommand(`title @s actionbar Good Morning`);
}

function ops() {
    // Unsubscribe if disabled in-game
    if (config.modules.ops.enabled === false) {
        World.events.tick.unsubscribe(ops);
        return;
    }
    let filter = new EntityQueryOptions();
    filter.tags = ['sleeping'];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        setTickTimeout(() => queueSleep(player), 40);
    }
}

const OPS = () => {
    World.events.tick.subscribe(() => ops());
};

export { OPS };