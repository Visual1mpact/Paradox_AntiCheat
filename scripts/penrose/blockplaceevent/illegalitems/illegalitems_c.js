import { world, BlockLocation, MinecraftBlockTypes } from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import config from "../../../data/config.js";
import { flag } from "../../../util.js";

const World = world;

function illegalitemsc(object) {
    // Unsubscribe if disabled in-game
    if (config.modules.illegalitemsC.enabled === false) {
        World.events.blockPlace.unsubscribe(illegalitemsc);
        return;
    }

    // Properties from class
    let { block, player, dimension } = object;
    // Block coordinates
    let { x, y, z } = block.location;

    if(illegalitems.includes(block.id) && !player.hasTag('paradoxOpped')) {
        dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air);
        flag(player, "IllegalItems", "C", "Exploit", false, false, false, false);
    }
}

const IllegalItemsC = () => {
    World.events.blockPlace.subscribe(object => illegalitemsc(object));
};

export { IllegalItemsC };
