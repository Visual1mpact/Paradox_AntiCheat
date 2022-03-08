import * as Minecraft from "mojang-minecraft";
import { setTickTimeout } from "../../../timer/scheduling.js";
import config from "../../../data/config.js";
import { flag, disabler } from "../../../util.js";

let World = Minecraft.world;

// Custom object and property
const _player = {
    countblocks: 0,
};

// This function will be called when tick event is triggered from the ScaffoldA function
function time() {
    _player.countblocks = 0;
}

function scaffolda(block) {
    // Unsubscribe if disabled in-game
    if (config.modules.antiscaffoldA.enabled === false) {
        World.events.blockPlace.unsubscribe(scaffolda);
        return;
    }
    // Count how many blocks are placed simultaneously
    if (!_player.countblocks) {
        _player.countblocks = 0;
    }
    _player.countblocks++;

    if (_player.countblocks >= config.modules.antiscaffoldA.max && !block.player.hasTag('paradoxOpped')) {
        flag(block.player, "Scaffold", "A", "Placement", "Spam", false, false, false);
        block.player.runCommand(`setblock ${block.block.x} ${block.block.y} ${block.block.z} air 0 destroy`);
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
            block.player.runCommand(`clear "${disabler(block.player.nameTag)}"`);
        } catch (error) {}
        try {
            block.player.runCommand(`tag "${disabler(block.player.nameTag)}" add "Reason:Illegal Scaffolding"`);
            block.player.runCommand(`tag "${disabler(block.player.nameTag)}" add "By:Paradox"`);
            block.player.addTag('isBanned');
        } catch (error) {
            block.player.triggerEvent('paradox:kick');
        }
    }
    // Delay the function by 1 second
    setTickTimeout(() => time(), 20);
}

const ScaffoldA = () => {
    World.events.blockPlace.subscribe(block => scaffolda(block));
};

export { ScaffoldA };
