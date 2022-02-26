import * as Minecraft from "mojang-minecraft";
import config from "../../../data/config.js";
import { setTickTimeout } from "../../../timer/scheduling.js";
import { flag } from "../../../util.js";

const World = Minecraft.world;

// Custom object and property
const _player = {
    countblocks: 0,
};

function onBeginTick() {
    _player.countblocks = 0;
}

const NukerA = () => {
    World.events.blockBreak.subscribe(block => {
        // Get the properties of the blocks being destroyed
        let blockID = block.brokenBlockPermutation.clone();

        // Count how many blocks are broken simultaneously
        if (!_player.countblocks) {
            _player.countblocks = 0;
        }
        _player.countblocks++;

        // Flag and salvage broken blocks to their original forms
        if (_player.countblocks >= config.modules.antinukerA.max && !block.player.hasTag('paradoxOpped')) {
            // Reach/B is triggered too but we don't want both spamming
            // So if Reach/B is enabled then temporarily disable
            if (config.modules.reachB.enabled === true) {
                config.modules.reachB.enabled = false;
                _player.check = 1;
            }
            flag(block.player, "Nuker", "A", "Break", "Nuke", _player.countblocks, false, false);
            block.block.setPermutation(blockID);
            // Restore setting for Reach/B if previously disabled
            if (block.player.check === 1) {
                config.modules.reachB.enabled = true;
            }
            let tags = block.player.getTags();

            // This removes old ban tags
            tags.forEach(t => {
                if(t.startsWith("Reason:")) {
                    block.player.removeTag(t.slice(1));
                }
                if(t.startsWith("By:")) {
                    block.player.removeTag(t.slice(1));
                }
            });
            try {
                block.player.runCommand(`clear "${block.player.nameTag}"`);
                block.player.runCommand(`tag "${block.player.nameTag}" add "Reason:Illegal Nuke"`);
                block.player.runCommand(`tag "${block.player.nameTag}" add "By:Paradox"`);
                block.player.addTag('isBanned');
            } catch (error) {
                block.player.triggerEvent('paradox:kick');
            }
        }
        setTickTimeout(() => onBeginTick(), 1);
    });
};

export { NukerA };
