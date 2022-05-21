import { BlockLocation, EntityQueryOptions, Location, world } from "mojang-minecraft";
import { crypto, disabler, getScore } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

// Make sure they don't tp inside a solid block
function safetyProtocol(player, x, y, z) {
    let blockVerification = parseInt(y.toFixed(0));
    let safe;
    for (let i = blockVerification; i < blockVerification + 100; i++) {
        let testAir = player.dimension.getBlock(new BlockLocation(x, i, z));
        if (testAir.isEmpty) {
            safe = parseInt(testAir.y);
            break;
        }
    }
    if (safe) {
        return safe;
    } else {
        return safe = y;
    }
}

const worldborder = () => {
    // Unsubscribe if disabled in-game
    if (config.modules.worldBorder.enabled === false) {
        World.events.tick.unsubscribe(worldborder);
        return;
    }
    let excludeStaff = new EntityQueryOptions();
    excludeStaff.excludeTags = ['Hash:' + crypto];
    for (let player of World.getPlayers(excludeStaff)) {
        // What is it currently set to
        let borderSize = getScore('worldborder', player);
        // Player coordinates
        let {x, y, z} = player.location;
        // Execute if worldborder is not disabled
        if (borderSize != 0) {
            // Make sure nobody climbs over the wall
            if (x > borderSize || x < -borderSize || z > borderSize || z < -borderSize) {
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"§4§lHey!§r You have reached the world border."}]}`);
                if (x >= borderSize) {
                    let safe = safetyProtocol(player, borderSize - 1, y, z);
                    player.teleport(new Location(borderSize - 1, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (x <= -borderSize) {
                    let safe = safetyProtocol(player, -borderSize + 1, y, z);
                    player.teleport(new Location(-borderSize + 1, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (z >= borderSize){
                    let safe = safetyProtocol(player, x, y, borderSize - 1);
                    player.teleport(new Location(x, safe, borderSize - 1), player.dimension, 0, player.bodyRotation);
                } else if (z <= -borderSize) {
                    let safe = safetyProtocol(player, x, y, -borderSize + 1);
                    player.teleport(new Location(x, safe, -borderSize + 1), player.dimension, 0, player.bodyRotation);
                }
            }
        }
    }
};

const WorldBorder = () => {
    World.events.tick.subscribe(() => worldborder());
};

export { WorldBorder };