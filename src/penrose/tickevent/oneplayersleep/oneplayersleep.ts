import { world, EntityQueryOptions, Player } from "@minecraft/server";
import config from "../../../data/config.js";
import { clearTickTimeout, setTickTimeout } from "../../../libs/scheduling.js";

const World = world;

function queueSleep(player: Player, id: number) {
    player.runCommandAsync(`time set sunrise`);
    player.runCommandAsync(`time add 2000`);
    player.runCommandAsync(`weather clear`);
    let hotbarBoolean = World.getDynamicProperty("hotbar_b");
    if (hotbarBoolean === undefined || hotbarBoolean === false) {
        player.runCommandAsync(`title @a[tag=!vanish] actionbar Good Morning`);
    }
    clearTickTimeout(id);
}

function ops() {
    // Get Dynamic Property
    let opsBoolean = World.getDynamicProperty("ops_b");
    if (opsBoolean === undefined) {
        opsBoolean = config.modules.ops.enabled;
    }
    // Unsubscribe if disabled in-game
    if (opsBoolean === false) {
        World.events.tick.unsubscribe(ops);
        return;
    }
    let filter = new Object() as EntityQueryOptions;
    filter.tags = ["sleeping"];
    let filterPlayers = [...World.getPlayers(filter)];
    if (filterPlayers.length) {
        const id = setTickTimeout(() => queueSleep(filterPlayers[0], id), 40);
    }
}

const OPS = () => {
    World.events.tick.subscribe(ops);
};

export { OPS };
