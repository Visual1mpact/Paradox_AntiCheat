import { world, MinecraftEffectTypes, EntityMovementComponent, system } from "@minecraft/server";
import { crypto, flag } from "../../../util.js";
import config from "../../../data/config.js";
import { dynamicPropertyRegistry } from "../../worldinitializeevent/registry.js";

const World = world;

function noslowa(id: number) {
    // Get Dynamic Property
    const noSlowBoolean = dynamicPropertyRegistry.get("noslowa_b");

    // Unsubscribe if disabled in-game
    if (noSlowBoolean === false) {
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
        // Check the players current speed and see if it exceeds the value we have hardcoded
        // If they do not have the effect for speed then we flag and reset their speed to the default value.
        if (speedcheck.current >= config.modules.noslowA.speed && !player.getEffect(MinecraftEffectTypes.speed)) {
            const speedrecord = speedcheck.current;
            flag(player, "NoSlow", "A", "Movement", null, null, "IllegalSpeed", speedrecord.toFixed(3), true, null);
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
export function NoSlowA() {
    const noSlowAId = system.runSchedule(() => {
        noslowa(noSlowAId);
    }, 40);
}
