import { world, MinecraftEffectTypes, EntityQueryOptions } from "mojang-minecraft";
import { crypto, flag } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";
import config from "../../../data/config.js";

const World = world;

function invalidsprinta() {
    // Unsubscribe if disabled in-game
    if (config.modules.invalidsprintA.enabled === false) {
        World.events.tick.unsubscribe(invalidsprinta);
        return;
    }
    let filter = new EntityQueryOptions();
    filter.excludeTags = ['Hash:' + crypto];
    // run as each player
    for (let player of World.getPlayers(filter)) {
        const speedcheck = player.getComponent('minecraft:movement');
        // Check the players current speed and see if it is equal or more than the value we have hardcoded
        // If they do have the effect for blindness and they are sprinting then we flag and reset their speed.
        if (speedcheck.current >= config.modules.invalidsprintA.speed && player.getEffect(MinecraftEffectTypes.blindness)) {
            let speedrecord = speedcheck.current;
            flag(player, "InvalidSprint", "A", "Movement", false, false, "BlindSprint", (speedrecord).toFixed(3), true, false);
            speedcheck.setCurrent(speedcheck.value);
        }
    }
    return;
}

const InvalidSprintA = () => {
    // Executes every 2 seconds
    setTickInterval(() => invalidsprinta(), 40);
};

export { InvalidSprintA };