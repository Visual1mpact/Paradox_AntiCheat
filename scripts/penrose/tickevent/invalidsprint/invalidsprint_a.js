import * as Minecraft from "mojang-minecraft";
import { flag } from "../../../util.js";
import { setTickInterval } from "../../../timer/scheduling.js";
import config from "../../../data/config.js";

const World = Minecraft.world;

const InvalidSprintA = () => {
    setTickInterval(() => {
        // run as each player
        for (let player of World.getPlayers()) {
            const speedcheck = player.getComponent('minecraft:movement');
            // Check the players current speed and see if it is equal or more than the value we have hardcoded
            // If they do have the effect for blindness and they are sprinting then we flag and reset their speed.
            if (speedcheck.current >= config.modules.invalidsprintA.speed && player.getEffect(Minecraft.MinecraftEffectTypes.blindness) && !player.hasTag('op')) {
                let speedrecord = speedcheck.current;
                flag(player, "InvalidSprint", "A", "Movement", "BlindSprint", (speedrecord).toFixed(3), true, false);
                speedcheck.setCurrent(speedcheck.value);
            }
        }
    }, 40); // Executes every 2 seconds
};

export { InvalidSprintA };