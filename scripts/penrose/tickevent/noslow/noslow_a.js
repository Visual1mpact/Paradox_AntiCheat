import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";
import config from "../../../data/config.js";
import { setTickInterval } from "../../../timer/scheduling.js";

const World = Minecraft.world;

const NoSlowA = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            const speedcheck = player.getComponent('minecraft:movement');
            // Check the players current speed and see if it exceeds the value we have hardcoded
            // If they do not have the effect for speed then we flag and reset their speed to the default value.
            if (speedcheck.current >= config.modules.noslowA.speed && !player.getEffect(Minecraft.MinecraftEffectTypes.speed) && !player.hasTag('op')) {
                let speedrecord = speedcheck.current;
                flag(player, "NoSlow", "A", "Movement", "IllegalSpeed", (speedrecord).toFixed(3), true, false);
                speedcheck.setCurrent(speedcheck.value);
            }
        }
    }, 40); // Executes every 2 seconds
};

export { NoSlowA };