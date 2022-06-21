import { world, EntityQueryOptions } from "mojang-minecraft";
import config from "../../../data/config.js";
import { clearTickTimeout, setTickTimeout } from "../../../timer/scheduling.js";

const World = world;

function queueSleep(player, id, opsBoolean) {
    // Unsubscribe if disabled in-game
    if (!opsBoolean) {
        clearTickTimeout(id);
        return;
    }
    player.runCommand(`time set sunrise`);
    player.runCommand(`time add 2000`);
    player.runCommand(`weather clear`);
    player.runCommand(`title @s actionbar Good Morning`);
}

function ops(callback) {
    // Get Dynamic Property
    let opsBoolean = World.getDynamicProperty('ops_b');
    if (opsBoolean === undefined) {
        opsBoolean = config.modules.ops.enabled;
    }
    // Unsubscribe if disabled in-game
    if (opsBoolean === false) {
        World.events.tick.unsubscribe(callback);
        return;
    }
    let filter = new EntityQueryOptions();
    filter.tags = ['sleeping'];
    // Run as each player
    for (let player of World.getPlayers(filter)) {
        const id = setTickTimeout(() => queueSleep(player, id, opsBoolean), 40);
    }
}

const OPS = () => {
    let callback;
    World.events.tick.subscribe(callback = () => ops(callback));
};

export { OPS };