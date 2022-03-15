import { world, BlockLocation, MinecraftBlockTypes } from "mojang-minecraft";
import config from "../../../data/config.js";
import { flag } from "../../../util.js";

let World = world;

let blockTimer = new Map();

function scaffolda(object) {
    // Unsubscribe if disabled in-game
    if (config.modules.antiscaffoldA.enabled === false) {
        World.events.blockPlace.unsubscribe(scaffolda);
        return;
    }

    // Properties from class
    let { block, player, dimension } = object;
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

    if (tiktok.length >= config.modules.antiscaffoldA.max && !player.hasTag('paradoxOpped')) {
        dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air);
        flag(player, "Scaffold", "A", "Placement", false, false, false, false);
        /*let tags = player.getTags();

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
            player.runCommand(`tag "${disabler(player.nameTag)}" add "Reason:Illegal Scaffolding"`);
            player.runCommand(`tag "${disabler(player.nameTag)}" add "By:Paradox"`);
            player.addTag('isBanned');
        } catch (error) {
            player.triggerEvent('paradox:kick');
        }*/
    }
}

const ScaffoldA = () => {
    World.events.blockPlace.subscribe(object => scaffolda(object));
};

export { ScaffoldA };
