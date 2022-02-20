import * as Minecraft from "mojang-minecraft";
import config from "../../../data/config.js";
import { flag } from "../../../util.js";

const World = Minecraft.world;

const ReachB = () => {
    World.events.blockBreak.subscribe(block => {
        // Get the name of the block being destroyed
        let blockID = block.brokenBlockPermutation.type.id;

        // Calculate the distance between the player and the block being destroyed
        let reach = Math.sqrt((block.block.location.x - block.player.location.x)**2 + (block.block.location.y - block.player.location.y)**2 + (block.block.location.z - block.player.location.z)**2);

        if(reach > config.modules.reachB.reach && !block.player.hasTag('op')) {
            flag(block.player, "Reach", "B", "Break", "reach", reach.toFixed(3), false, false);
            block.player.runCommand(`setblock ${block.block.x} ${block.block.y} ${block.block.z} ${blockID}`);
        }
    });
};

export { ReachB };
