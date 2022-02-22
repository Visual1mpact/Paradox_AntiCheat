import * as Minecraft from "mojang-minecraft";
import config from "../../../data/config.js";
import { flag } from "../../../util.js";

const World = Minecraft.world;

const NukerA = () => {
    World.events.blockBreak.subscribe(block => {
        // Get the properties of the blocks being destroyed
        let blockID = block.brokenBlockPermutation.clone();

        // Count how many blocks are broken simultaneously
        // countblocks is a custom property
        if (!block.player.countblocks) {
            block.player.countblocks = 0;
        }
        block.player.countblocks++;

        // Flag and salvage broken blocks to their original forms
        if (block.player.countblocks >= config.modules.antinukerA.max) {
            // Reach/B is triggered too but we don't want both spamming
            // So if Reach/B is enabled then temporarily disable
            if (config.modules.reachB.enabled === true) {
                config.modules.reachB.enabled = false;
                block.player.check = 1;
            }
            flag(block.player, "Nuker", "A", "Break", "Nuke", block.player.countblocks, false, false);
            block.block.setPermutation(blockID);
            block.player.countblocks = 0;
            // Restore setting for Reach/B if previously disabled
            if (block.player.check === 1) {
                config.modules.reachB.enabled = true;
                block.player.check = 0;
            }
        }
    });
};

export { NukerA };
