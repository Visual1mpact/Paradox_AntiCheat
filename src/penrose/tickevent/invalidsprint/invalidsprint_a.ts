import { world, MinecraftEffectTypes, EntityMovementComponent, system } from "@minecraft/server";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";

const World = world;

function invalidsprinta(id) {
    // Get Dynamic Property
    let invalidSprintABoolean = World.getDynamicProperty("invalidsprinta_b");
    if (invalidSprintABoolean === undefined) {
        invalidSprintABoolean = config.modules.invalidsprintA.enabled;
    }
    // Unsubscribe if disabled in-game
    if (invalidSprintABoolean === false) {
        system.clearRunSchedule(id);
        return;
    }
    // run as each player
    for (const player of World.getPlayers()) {
        // Check for hash/salt and validate password
        const hash = player.getDynamicProperty("hash");
        const salt = player.getDynamicProperty("salt");
        let encode: string;
        try {
            encode = crypto(salt, config.modules.encryption.password);
        } catch (error) {}
        if (hash !== undefined && encode === hash) {
            continue;
        }
        const speedcheck = player.getComponent("minecraft:movement") as EntityMovementComponent;
        // Check the players current speed and see if it is equal or more than the value we have hardcoded
        // If they do have the effect for blindness and they are sprinting then we flag and reset their speed.
        if (speedcheck.current >= config.modules.invalidsprintA.speed && player.getEffect(MinecraftEffectTypes.blindness)) {
            const speedrecord = speedcheck.current;
            flag(player, "InvalidSprint", "A", "Movement", null, null, "BlindSprint", speedrecord.toFixed(3), true, null);
            speedcheck.setCurrent(speedcheck.value);
        }
    }
    return;
}

/**
 * We store the identifier in a variable
 * to cancel the execution of this scheduled run
 * if needed to do so.
 */
export function InvalidSprintA() {
    system.runSchedule(() => {
        invalidsprinta(InvalidSprintA);
    }, 40);
}
