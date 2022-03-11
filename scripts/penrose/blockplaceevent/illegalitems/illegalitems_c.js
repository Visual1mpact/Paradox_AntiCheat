import * as Minecraft from "mojang-minecraft";
import { illegalitems } from "../../../data/itemban.js";
import config from "../../../data/config.js";
import { flag } from "../../../util.js";

const World = Minecraft.world;

function illegalitemsc(block) {
    // Unsubscribe if disabled in-game
    if (config.modules.illegalitemsC.enabled === false) {
        World.events.blockPlace.unsubscribe(illegalitemsc);
        return;
    }
    if(illegalitems.includes(block.block.id) && !block.player.hasTag('paradoxOpped')) {
        flag(block.player, "IllegalItems", "C", "Exploit", false, false, false, false);
        block.player.runCommand(`setblock ${block.block.x} ${block.block.y} ${block.block.z} air`);
    }
}

const IllegalItemsC = () => {
    World.events.blockPlace.subscribe(block => illegalitemsc(block));
};

export { IllegalItemsC };
