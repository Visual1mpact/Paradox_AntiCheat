import * as Minecraft from "mojang-minecraft";
import { setTickTimeout } from "../../../timer/scheduling.js";
import config from "../../../data/config.js";
import { flag } from "../../../util.js";

let World = Minecraft.world;

// Custom object and property
const _player = {
    countblocks: 0,
};

// This function will be called when tick event is triggered from the ScaffoldA function
function time() {
    _player.countblocks = 0;
}

const ScaffoldA = () => {
    World.events.blockPlace.subscribe(block => {
        // Count how many blocks are placed simultaneously
        if (!_player.countblocks) {
            _player.countblocks = 0;
        }
        _player.countblocks++;

        if (_player.countblocks >= config.modules.antiscaffoldA.max && !block.player.hasTag('paradoxOpped')) {
            flag(block.player, "Scaffold", "A", "Placement", "Spam", false, false, false);
            block.player.runCommand(`setblock ${block.block.x} ${block.block.y} ${block.block.z} air 0 destroy`);
            try {
                block.player.runCommand(`clear "${block.player.nameTag}"`);
                block.player.addTag('isBanned');
            } catch (error) {
                block.player.triggerEvent('paradox:kick');
            }
        }
        // Delay the function by 1 second
        setTickTimeout(() => time(), 20);
    });
};

export { ScaffoldA };
