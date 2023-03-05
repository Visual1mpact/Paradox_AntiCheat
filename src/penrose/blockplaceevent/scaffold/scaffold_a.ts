import { world, BlockLocation, MinecraftBlockTypes, BlockPlaceEvent } from "@minecraft/server";
import config from "../../../data/config.js";
import { crypto, flag } from "../../../util.js";
import { kickablePlayers } from "../../../kickcheck.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

let blockTimer = new Map();

function scaffolda(object: BlockPlaceEvent) {
    // Get Dynamic Property
    const antiScaffoldABoolean = dynamicPropertyRegistry.get("antiscaffolda_b");

    // Unsubscribe if disabled in-game
    if (antiScaffoldABoolean === false) {
        World.events.blockPlace.unsubscribe(scaffolda);
        return;
    }

    // Properties from class
    const { block, player, dimension } = object;

    // Get unique ID
    const uniqueId = dynamicPropertyRegistry.get(player.scoreboard.id);

    // Skip if they have permission
    if (uniqueId === player.name) {
        return;
    }

    // Block coordinates
    const { x, y, z } = block.location;

    let timer: Date[];
    if (blockTimer.has(player.nameTag)) {
        timer = blockTimer.get(player.nameTag);
    } else {
        timer = [];
    }

    timer.push(new Date());

    const tiktok = timer.filter((time) => time.getTime() > new Date().getTime() - 100);
    blockTimer.set(player.nameTag, tiktok);

    if (tiktok.length >= config.modules.antiscaffoldA.max) {
        dimension.getBlock(new BlockLocation(x, y, z)).setType(MinecraftBlockTypes.air);
        flag(player, "Scaffold", "A", "Placement", null, null, null, null, false, null);
        /*
        try {
            player.runCommand(`tag "${disabler(player.nameTag)}" add "
            :Illegal Scaffolding"`);
            player.runCommand(`tag "${disabler(player.nameTag)}" add "By:Paradox"`);
            player.addTag('isBanned');
        } catch (error) {
            kickablePlayers.add(player); player.triggerEvent('paradox:kick');
        }*/
    }
}

const ScaffoldA = () => {
    World.events.blockPlace.subscribe(scaffolda);
};

export { ScaffoldA };
