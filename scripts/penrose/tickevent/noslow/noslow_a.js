import { world, MinecraftEffectTypes } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { clearTickInterval, setTickInterval } from "../../../timer/scheduling.js";

const World = world;

function noslowa(callback, id) {
    // Get Dynamic Property
    let noSlowBoolean = World.getDynamicProperty('noslowa_b');
    if (noSlowBoolean === undefined) {
        noSlowBoolean = config.modules.noslowA.enabled;
    }
    // Unsubscribe if disabled in-game
    if (config.modules.noslowA.enabled === false) {
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
        const speedcheck = player.getComponent('minecraft:movement');
        // Check the players current speed and see if it exceeds the value we have hardcoded
        // If they do not have the effect for speed then we flag and reset their speed to the default value.
        if (speedcheck.current >= config.modules.noslowA.speed && !player.getEffect(MinecraftEffectTypes.speed)) {
            let speedrecord = speedcheck.current;
            flag(player, "NoSlow", "A", "Movement", false, false, "IllegalSpeed", (speedrecord).toFixed(3), true, false);
            speedcheck.setCurrent(speedcheck.value);
        }
    }
    return;
}

const NoSlowA = () => {
    // Executes every 2 seconds
    let callback;
    const id = setTickInterval(callback = () => noslowa(callback, id), 40);
    id();
};

export { NoSlowA };