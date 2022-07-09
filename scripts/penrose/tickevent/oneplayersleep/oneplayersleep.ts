import { world, EntityQueryOptions, Player } from "mojang-minecraft";
import config from "../../../data/config.js";
import { clearTickTimeout, setTickTimeout } from "../../../misc/scheduling.js";

const World = world;

function queueSleep(player: Player, id: number) {
    player.runCommand(`time set sunrise`);
    player.runCommand(`time add 2000`);
    player.runCommand(`weather clear`);
    let hotbarBoolean = World.getDynamicProperty('hotbar_b');
    if (hotbarBoolean === undefined || hotbarBoolean === false) {
        player.runCommand(`title @a[tag=!vanish] actionbar Good Morning`);
    }
    clearTickTimeout(id);
}

function ops() {
    // Get Dynamic Property
    let opsBoolean = World.getDynamicProperty('ops_b');
    if (opsBoolean === undefined) {
        opsBoolean = config.modules.ops.enabled;
    }
    // Unsubscribe if disabled in-game
    if (opsBoolean === false) {
        World.events.tick.unsubscribe(ops);
        return;
    }
    let filter = new EntityQueryOptions();
    filter.tags = ['sleeping'];
    let filterPlayers = [...World.getPlayers(filter)];
    if (filterPlayers.length) {
        const id = setTickTimeout(() => queueSleep(filterPlayers[0], id), 40);
    }
}

const OPS = () => {
    World.events.tick.subscribe(ops);
};

export { OPS };