import * as Minecraft from "mojang-minecraft";
import config from "../../../data/config.js";
// import { flag } from "../../../util.js";

const World = Minecraft.world;

function reacha(block) {
    // Unsubscribe if disabled in-game
    if (config.modules.reachA.enabled === false) {
        World.events.blockPlace.unsubscribe(reacha);
        return;
    }
    // Calculate the distance between the player and the block being placed
    let reach = Math.sqrt((block.block.location.x - block.player.location.x)**2 + (block.block.location.y - block.player.location.y)**2 + (block.block.location.z - block.player.location.z)**2);

    if(reach > config.modules.reachA.reach && !block.player.hasTag('paradoxOpped')) {
        // flag(block.player, "Reach", "A", "Placement", "reach", reach.toFixed(3), false, false);
        block.player.runCommand(`setblock ${block.block.x} ${block.block.y} ${block.block.z} air 0 destroy`);
    }
}

const ReachA = () => {
    World.events.blockPlace.subscribe(block => reacha(block));
};

export { ReachA };
