import { world, BlockLocation } from "mojang-minecraft";
import config from "../../../data/config.js";
import { flag } from "../../../util.js";

const World = world;

let blockTimer = new Map();

function nukera(block) {
    if (config.modules.antinukerA.enabled === false) {
        World.events.blockBreak.unsubscribe(block => nukera(block));
        return;
    }

    let timer;
    if (blockTimer.has(block.player.nameTag)) {
        timer = blockTimer.get(block.player.nameTag);
    } else {
        timer = [];
    }

    timer.push(new Date());

    let tiktok = timer.filter(time => time.getTime() > new Date().getTime() - 100);
    blockTimer.set(block.player.nameTag, tiktok);

    // Get the properties of the blocks being destroyed
    let blockID = block.brokenBlockPermutation.clone();
    let { x, y, z } = block.block;
    let dimension = block.dimension;
    let blockLoc;
    if (dimension === World.getDimension("overworld")) {
        blockLoc = World.getDimension("overworld").getBlock(new BlockLocation(x, y, z));
    }
    if (dimension === World.getDimension("nether")) {
        blockLoc = World.getDimension("nether").getBlock(new BlockLocation(x, y, z));
    }
    if (dimension === World.getDimension("the end")) {
        blockLoc = World.getDimension("the end").getBlock(new BlockLocation(x, y, z));
    }

    // Flag and salvage broken blocks to their original forms
    if (tiktok.length >= config.modules.antinukerA.max && !block.player.hasTag('paradoxOpped')) {
        flag(block.player, "Nuker", "A", "Break", false, false, false, false);
        blockLoc.setPermutation(blockID);
        try {
            // Remove dropped items after nuking because it will leave a mess of entities in the world
            block.player.runCommand(`kill @e[x=${x},y=${y},z=${z},r=10,c=1,type=item]`);
        } catch (error) {}

        /* let tags = block.player.getTags();

        // This removes old ban tags
        tags.forEach(t => {
            if(t.startsWith("Reason:")) {
                block.player.removeTag(t);
            }
            if(t.startsWith("By:")) {
                block.player.removeTag(t);
            }
        });
        try {
            block.player.runCommand(`tag "${block.disabler(player.nameTag)}" add "Reason:Illegal Nuke"`);
            block.player.runCommand(`tag "${block.disabler(player.nameTag)}" add "By:Paradox"`);
            block.player.addTag('isBanned');
        } catch (error) {
            block.player.triggerEvent('paradox:kick');
        } */
    }
}

const NukerA = () => {
    World.events.blockBreak.subscribe(block => nukera(block));
};

export { NukerA };
