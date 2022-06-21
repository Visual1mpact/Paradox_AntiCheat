import { world, Location, BlockLocation } from "mojang-minecraft";
import { clearTickInterval, setTickInterval } from "../../../timer/scheduling.js";
import config from "../../../data/config.js";
import { crypto } from "../../../util.js";

const World = world;

let BlockAtPlayer0;
let BlockAtPlayer1;

const _player = {
    count: 0
};

function timer(player, dimension, x, y, z) {
    player.teleport(new Location(x, y - 2, z), dimension, 0, 0);
    _player.count = 0;
}

function jesusa(callback, id){
    // Get Dynamic Property
    let jesusaBoolean = World.getDynamicProperty('jesusa_b');
    if (jesusaBoolean === undefined) {
        jesusaBoolean = config.modules.jesusA.enabled;
    }
    // Unsubscribe if disabled in-game
    if (jesusaBoolean === false) {
        World.events.tick.unsubscribe(callback);
        clearTickInterval(id);
        return;
    }
    // run as each player
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
        const x = Math.floor(player.location.x);
        const y = Math.floor(player.location.y);
        const z = Math.floor(player.location.z);
        const dimension = player.dimension;
        try {
            // Below Below player
            BlockAtPlayer0 = player.dimension.getBlock(new BlockLocation(x, y - 1, z));
            // Below player
            BlockAtPlayer1 = player.dimension.getBlock(new BlockLocation(x, y, z));
        } catch (error) {}

        if (!player.hasTag('vanish') && !player.hasTag('swimming') && !player.hasTag('riding') && !player.hasTag('flying') && BlockAtPlayer1.type.id === "minecraft:water" && BlockAtPlayer0.type.id === "minecraft:water" || !player.hasTag('vanish') && !player.hasTag('swimming') && !player.hasTag('riding') && !player.hasTag('flying') && BlockAtPlayer1.type.id === "minecraft:lava" && BlockAtPlayer0.type.id === "minecraft:lava") {
            _player.count++;
            // Flag them after 2 seconds of activity
            if (_player.count === 1) {
                timer(player, dimension, x, y, z);
            }
        }
        // Reset count
        if (player.hasTag('ground')) {
            _player.count = 0;
        }
    }
    return;
}

const JesusA = () => {
    // Executes every 1 seconds
    let callback
    const id = setTickInterval(callback = () => jesusa(callback, id), 20);
};

export { JesusA };