import { world, BlockLocation } from "mojang-minecraft";
import config from "../../../data/config.js";
import { flag } from "../../../util.js";

const World = world;

let blockTimer = new Map();

function nukera(object) {
    if (config.modules.antinukerA.enabled === false) {
        World.events.blockBreak.unsubscribe(nukera);
        return;
    }

    // Properties from class
    let { block, player, dimension, brokenBlockPermutation } = object;
    // Block coordinates
    let { x, y, z } = block.location;

    let timer;
    if (blockTimer.has(player.nameTag)) {
        timer = blockTimer.get(player.nameTag);
    } else {
        timer = [];
    }

    timer.push(new Date());

    let tiktok = timer.filter(time => time.getTime() > new Date().getTime() - 100);
    blockTimer.set(player.nameTag, tiktok);

    // Get the properties of the blocks being destroyed
    let blockID = brokenBlockPermutation.clone();

    // Block dimension and location for permutation
    let blockLoc = dimension.getBlock(new BlockLocation(x, y, z));

    // Flag and salvage broken blocks to their original forms
    if (tiktok.length >= config.modules.antinukerA.max && !player.hasTag('paradoxOpped')) {
        flag(player, "Nuker", "A", "Break", false, false, false, false);
        blockLoc.setPermutation(blockID);
        try {
            // Remove dropped items after nuking because it will leave a mess of entities in the world
            player.runCommand(`kill @e[x=${x},y=${y},z=${z},r=10,c=1,type=item]`);
        } catch (error) {}

        /* let tags = player.getTags();

        // This removes old ban tags
        tags.forEach(t => {
            if(t.startsWith("Reason:")) {
                player.removeTag(t);
            }
            if(t.startsWith("By:")) {
                player.removeTag(t);
            }
        });
        try {
            player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:Illegal Nuke"`);
            player.runCommand(`tag "${disabler(player.nameTag)}" add "By:Paradox"`);
            player.addTag('isBanned');
        } catch (error) {
            player.triggerEvent('paradox:kick');
        } */
    }
}

const NukerA = () => {
    World.events.blockBreak.subscribe(object => nukera(object));
};

export { NukerA };
