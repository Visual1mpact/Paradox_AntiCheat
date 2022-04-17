import { BlockLocation, Location, world } from "mojang-minecraft";
import { disabler, getScore } from "../../../util.js";
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
    for (let player of World.getPlayers()) {
        // What is it currently set to
        let borderSize = getScore('worldborder', player);
        // Player coordinates
        let {x, y, z} = player.location;
        // Execute if worldborder is not disabled
        if (borderSize != 0) {
            // 1k
            if (borderSize === 1 && x > 1000 || borderSize === 1 && x < -1000 || borderSize === 1 && z > 1000 || borderSize === 1 && z < -1000) {
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"§4§lHey!§r You have reached the world border."}]}`);
                if (x >= 1000) {
                    let safe = safetyProtocol(player, 999, y, z);
                    player.teleport(new Location(999, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (x <= -1000) {
                    let safe = safetyProtocol(player, -999, y, z);
                    player.teleport(new Location(-999, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (z >= 1000){
                    let safe = safetyProtocol(player, x, y, 999);
                    player.teleport(new Location(x, safe, 999), player.dimension, 0, player.bodyRotation);
                } else if (z <= -1000) {
                    let safe = safetyProtocol(player, x, y, -999);
                    player.teleport(new Location(x, safe, -999), player.dimension, 0, player.bodyRotation);
                }
            }

            // 5k
            if (borderSize === 2 && x > 5000 || borderSize === 2 && x < -5000 || borderSize === 2 && z > 5000 || borderSize === 2 && z < -5000) {
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"§4§lHey!§r You have reached the world border."}]}`);
                if (x >= 5000) {
                    let safe = safetyProtocol(player, 4999, y, z);
                    player.teleport(new Location(4999, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (x <= -5000) {
                    let safe = safetyProtocol(player, -4999, y, z);
                    player.teleport(new Location(-4999, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (z >= 5000){
                    let safe = safetyProtocol(player, x, y, 4999);
                    player.teleport(new Location(x, safe, 4999), player.dimension, 0, player.bodyRotation);
                } else if (z <= -5000) {
                    let safe = safetyProtocol(player, x, y, -4999);
                    player.teleport(new Location(x, safe, -4999), player.dimension, 0, player.bodyRotation);
                }
            }

            // 10k
            if (borderSize === 3 && x > 10000 || borderSize === 3 && x < -10000 || borderSize === 3 && z > 10000 || borderSize === 3 && z < -10000) {
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"§4§lHey!§r You have reached the world border."}]}`);
                if (x >= 10000) {
                    let safe = safetyProtocol(player, 9999, y, z);
                    player.teleport(new Location(9999, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (x <= -10000) {
                    let safe = safetyProtocol(player, -9999, y, z);
                    player.teleport(new Location(-9999, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (z >= 10000){
                    let safe = safetyProtocol(player, x, y, 9999);
                    player.teleport(new Location(x, safe, 9999), player.dimension, 0, player.bodyRotation);
                } else if (z <= -10000) {
                    let safe = safetyProtocol(player, x, y, -9999);
                    player.teleport(new Location(x, safe, -9999), player.dimension, 0, player.bodyRotation);
                }
            }

            // 25k
            if (borderSize === 4 && x > 25000 || borderSize === 4 && x < -25000 || borderSize === 4 && z > 25000 || borderSize === 4 && z < -25000) {
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"§4§lHey!§r You have reached the world border."}]}`);
                if (x >= 25000) {
                    let safe = safetyProtocol(player, 24999, y, z);
                    player.teleport(new Location(24999, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (x <= -25000) {
                    let safe = safetyProtocol(player, -24999, y, z);
                    player.teleport(new Location(-24999, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (z >= 25000){
                    let safe = safetyProtocol(player, x, y, 24999);
                    player.teleport(new Location(x, safe, 24999), player.dimension, 0, player.bodyRotation);
                } else if (z <= -25000) {
                    let safe = safetyProtocol(player, x, y, -24999);
                    player.teleport(new Location(x, safe, -24999), player.dimension, 0, player.bodyRotation);
                }
            }

            // 50k
            if (borderSize === 5 && x > 50000 || borderSize === 5 && x < -50000 || borderSize === 5 && z > 50000 || borderSize === 5 && z < -50000) {
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"§4§lHey!§r You have reached the world border."}]}`);
                if (x >= 50000) {
                    let safe = safetyProtocol(player, 49999, y, z);
                    player.teleport(new Location(49999, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (x <= -50000) {
                    let safe = safetyProtocol(player, -49999, y, z);
                    player.teleport(new Location(-49999, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (z >= 50000){
                    let safe = safetyProtocol(player, x, y, 49999);
                    player.teleport(new Location(x, safe, 49999), player.dimension, 0, player.bodyRotation);
                } else if (z <= -50000) {
                    let safe = safetyProtocol(player, x, y, -49999);
                    player.teleport(new Location(x, safe, -49999), player.dimension, 0, player.bodyRotation);
                }
            }

            // 100k
            if (borderSize === 6 && x > 100000 || borderSize === 6 && x < -100000 || borderSize === 6 && z > 100000 || borderSize === 6 && z < -100000) {
                player.runCommand(`tellraw "${disabler(player.nameTag)}" {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"§4§lHey!§r You have reached the world border."}]}`);
                if (x >= 100000) {
                    let safe = safetyProtocol(player, 99999, y, z);
                    player.teleport(new Location(99999, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (x <= -100000) {
                    let safe = safetyProtocol(player, -99999, y, z);
                    player.teleport(new Location(-99999, safe, z), player.dimension, 0, player.bodyRotation);
                } else if (z >= 100000){
                    let safe = safetyProtocol(player, x, y, 99999);
                    player.teleport(new Location(x, safe, 99999), player.dimension, 0, player.bodyRotation);
                } else if (z <= -100000) {
                    let safe = safetyProtocol(player, x, y, -99999);
                    player.teleport(new Location(x, safe, -99999), player.dimension, 0, player.bodyRotation);
                }
            }
        }
    }
};

const WorldBorder = () => {
    World.events.tick.subscribe(() => worldborder());
};

export { WorldBorder };