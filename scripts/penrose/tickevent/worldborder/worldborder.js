import { BlockLocation, Location, world } from "mojang-minecraft";
import { crypto, sendMsgToPlayer } from "../../../util.js";
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

function worldborder() {
    // Dynamic Properties for boolean
    let worldBorderBoolean = World.getDynamicProperty('worldborder_b');
    if (worldBorderBoolean === undefined) {
        worldBorderBoolean = config.modules.worldBorder.enabled;
    }
    // Dynamic Properties for number
    let worldBorderNumber = World.getDynamicProperty('worldborder_n');
    if (worldBorderNumber === undefined) {
        worldBorderNumber = config.modules.worldBorder.bordersize;
    }
    // Unsubscribe if disabled in-game
    if (worldBorderBoolean === false) {
        World.events.tick.unsubscribe(worldborder);
        return;
    }
    for (let player of World.getPlayers()) {
        // Check for hash/salt and validate password
        let hash = player.getDynamicProperty('hash');
        let salt = player.getDynamicProperty('salt');
        let encode;
    try {
        encode = crypto(salt, config.modules.encryption.password);
    } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }
        // What is it currently set to
        let borderSize = worldBorderNumber;
        // Make sure it's not a negative
        if (borderSize < 0) {
            borderSize = Math.abs(borderSize);
        }
        // Player coordinates
        let {x, y, z} = player.location;
        // Player dimension
        let { id } = player.dimension;
        // If player is in the nether then modify the size of the world border
        if (id === "minecraft:nether") {
            // If they set it to 0 or below then default to 1
            if (config.modules.worldBorder.nether <= 0) {
                config.modules.worldBorder.nether = 1;
            }
            borderSize = borderSize / config.modules.worldBorder.nether;
        }
        // If the player is in the end then ignore the world border
        if (id === "minecraft:the_end") {
            continue;
        }
        // Execute if worldborder is not disabled
        if (borderSize != 0) {
            // Make sure nobody climbs over the wall
            if (x > borderSize || x < -borderSize || z > borderSize || z < -borderSize) {
                sendMsgToPlayer(player, `§r§4[§6Paradox§4]§r You have reached the world border.`);
                if (x >= borderSize) {
                    let safe = safetyProtocol(player, borderSize - 3, y, z);
                    player.teleport(new Location(borderSize - 3, safe, z), player.dimension, 0, 0);
                } else if (x <= -borderSize) {
                    let safe = safetyProtocol(player, -borderSize + 3, y, z);
                    player.teleport(new Location(-borderSize + 3, safe, z), player.dimension, 0, 0);
                } else if (z >= borderSize){
                    let safe = safetyProtocol(player, x, y, borderSize - 3);
                    player.teleport(new Location(x, safe, borderSize - 3), player.dimension, 0, 0);
                } else if (z <= -borderSize) {
                    let safe = safetyProtocol(player, x, y, -borderSize + 3);
                    player.teleport(new Location(x, safe, -borderSize + 3), player.dimension, 0, 0);
                }
            }
        }
    }
}

const WorldBorder = () => {
    World.events.tick.subscribe(worldborder);
};

export { WorldBorder };