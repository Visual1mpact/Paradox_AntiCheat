import * as Minecraft from "mojang-minecraft";
import config from "../../../data/config.js";
import { setTickTimeout } from "../../../timer/scheduling.js";
import { flag } from "../../../util.js";

const World = Minecraft.world;

// Custom object and property
const _player = {
    countblocks: 0
};

function onBeginTick() {
    _player.countblocks = 0;
}

function nukera(block) {
    if (config.modules.antinukerA.enabled === false) {
        World.events.blockBreak.unsubscribe(block => nukera(block));
        return;
    }
    // Get the properties of the blocks being destroyed
    let blockID = block.brokenBlockPermutation.clone();

    // Count how many blocks are broken simultaneously
    if (!_player.countblocks) {
        _player.countblocks = 0;
    }
    _player.countblocks++;

    // Flag and salvage broken blocks to their original forms
    if (_player.countblocks >= config.modules.antinukerA.max && !block.player.hasTag('paradoxOpped')) {
        flag(block.player, "Nuker", "A", "Break", "Nuke", false, false, false);
        block.block.setPermutation(blockID);

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
    setTickTimeout(() => onBeginTick(), 0.1);
}

const NukerA = () => {
    World.events.blockBreak.subscribe(block => nukera(block));
};

export { NukerA };
